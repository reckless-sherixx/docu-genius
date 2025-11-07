import { Worker, Job } from 'bullmq';
import { PrismaClient, TemplateStatus, TemplateType, FieldType } from '@prisma/client';
import { s3Service } from '../services/s3.service.js';
import { redisConnection } from '../config/redis.config.js';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const prisma = new PrismaClient();

interface TemplateProcessJob {
  templateId: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
}

interface ExtractedField {
  fieldName: string;
  fieldType: FieldType;
  placeholder: string;
  positionData?: any;
}

class TemplateProcessor {
  /**
   * Main processing function
   */
  async processTemplate(job: Job<TemplateProcessJob>): Promise<void> {
    const { templateId, s3Key, fileName, mimeType } = job.data;

    console.log(`🚀 Starting template processing: ${templateId}`);

    try {
      // Update status to PROCESSING
      await prisma.template.update({
        where: { id: templateId },
        data: {
          status: TemplateStatus.PROCESSING,
          processing_started_at: new Date(),
        },
      });

      // Download file from S3
      console.log(`📥 Downloading file from S3: ${s3Key}`);
      const fileBuffer = await s3Service.downloadFileAsBuffer(s3Key);

      // Determine template type
      const templateType = this.determineTemplateType(mimeType, fileBuffer);
      console.log(`📄 Template type detected: ${templateType}`);

      // Extract text based on template type
      let extractedText = '';
      let totalPages = 1;

      if (templateType === TemplateType.TEXT_PDF) {
        const result = await this.extractTextFromPDF(fileBuffer);
        extractedText = result.text;
        totalPages = result.pages;
      } else if (templateType === TemplateType.SCANNED_PDF) {
        const result = await this.extractTextFromScannedPDF(fileBuffer);
        extractedText = result.text;
        totalPages = result.pages;
      } else if (templateType === TemplateType.IMAGE) {
        extractedText = await this.extractTextFromImage(fileBuffer);
      }

      console.log(`✅ Text extracted (${extractedText.length} characters)`);

      // Detect placeholders/fields
      console.log(`🔍 Detecting placeholders...`);
      const detectedFields = this.detectPlaceholders(extractedText);
      console.log(`✅ Detected ${detectedFields.length} fields`);

      // Update template in database
      await prisma.template.update({
        where: { id: templateId },
        data: {
          extracted_text: extractedText,
          total_pages: totalPages,
          template_type: templateType,
          status: TemplateStatus.READY,
          processing_completed_at: new Date(),
        },
      });

      // Create template fields
      if (detectedFields.length > 0) {
        await prisma.templateField.createMany({
          data: detectedFields.map((field) => ({
            template_id: templateId,
            field_name: field.fieldName,
            field_type: field.fieldType,
            placeholder: field.placeholder,
            position_data: field.positionData || {},
          })),
        });
      }

      console.log(`✅ Template processing completed: ${templateId}`);

      // TODO: Emit WebSocket event to notify frontend
      // await this.notifyFrontend(templateId, 'READY');
    } catch (error) {
      console.error(`❌ Template processing failed: ${templateId}`, error);

      // Update template with error
      await prisma.template.update({
        where: { id: templateId },
        data: {
          status: TemplateStatus.FAILED,
          processing_error: error instanceof Error ? error.message : 'Unknown error',
          processing_completed_at: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Determine if PDF is text-based or scanned
   */
  private determineTemplateType(mimeType: string, buffer: Buffer): TemplateType {
    if (mimeType.includes('image/')) {
      return TemplateType.IMAGE;
    }

    if (mimeType.includes('pdf')) {
      // Check if PDF has text layer
      const pdfString = buffer.toString('utf-8');
      const hasTextContent = pdfString.includes('/Type/Font') || pdfString.includes('/Subtype/Type1');

      return hasTextContent ? TemplateType.TEXT_PDF : TemplateType.SCANNED_PDF;
    }

    return TemplateType.TEXT_PDF; // Default
  }

  /**
   * Extract text from text-based PDF
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pages: number }> {
    console.log('📖 Extracting text from PDF (text-based)');

    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      
      console.log(`✅ Extracted ${data.text.length} characters from ${data.numpages} pages`);
      
      return {
        text: data.text,
        pages: data.numpages,
      };
    } catch (error) {
      console.error('❌ Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from scanned PDF using OCR
   */
  private async extractTextFromScannedPDF(buffer: Buffer): Promise<{ text: string; pages: number }> {
    console.log('🖼️ Processing scanned PDF with OCR');

    try {
      // First, try to extract any existing text
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(buffer);
      const pages = pdfData.numpages;
      
      // If there's minimal text, it's likely scanned - apply OCR
      if (pdfData.text.trim().length < 100) {
        console.log('🔍 Minimal text found, applying OCR...');
        
        // Note: For production, you'd convert PDF to images first using pdf2pic or similar
        // For now, we'll process as if it's already an image
        const ocrText = await this.performOCR(buffer);
        
        return {
          text: ocrText,
          pages: pages,
        };
      }
      
      // If there's substantial text, return it
      return {
        text: pdfData.text,
        pages: pages,
      };
    } catch (error) {
      console.error('❌ Error processing scanned PDF:', error);
      throw new Error('Failed to process scanned PDF');
    }
  }

  /**
   * Perform OCR on buffer using Tesseract
   */
  private async performOCR(buffer: Buffer): Promise<string> {
    console.log('🔤 Running OCR with Tesseract...');
    
    const worker = await createWorker('eng');
    
    try {
      // Preprocess image with Sharp for better OCR results
      const preprocessedBuffer = await sharp(buffer)
        .greyscale()
        .normalize()
        .sharpen()
        .toBuffer();
      
      const { data: { text } } = await worker.recognize(preprocessedBuffer);
      
      console.log(`✅ OCR completed, extracted ${text.length} characters`);
      
      return text;
    } catch (error) {
      console.error('❌ OCR failed:', error);
      throw new Error('OCR processing failed');
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Extract text from image using OCR
   */
  private async extractTextFromImage(buffer: Buffer): Promise<string> {
    console.log('📷 Processing image with OCR');

    try {
      return await this.performOCR(buffer);
    } catch (error) {
      console.error('❌ Error processing image:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Detect placeholders in extracted text
   */
  private detectPlaceholders(text: string): ExtractedField[] {
    const fields: ExtractedField[] = [];

    // Pattern 1: {{FIELD_NAME}} format
    const bracketPattern = /\{\{([A-Z_]+)\}\}/g;
    let match;

    while ((match = bracketPattern.exec(text)) !== null) {
      const fieldName = match[1];
      const placeholder = match[0];

      if (fieldName) {
        fields.push({
          fieldName: this.formatFieldName(fieldName),
          fieldType: this.inferFieldType(fieldName),
          placeholder,
        });
      }
    }

    // Pattern 2: [FIELD_NAME] format
    const squareBracketPattern = /\[([A-Z_\s]+)\]/g;
    while ((match = squareBracketPattern.exec(text)) !== null) {
      const fieldName = match[1];
      const placeholder = match[0];

      if (fieldName) {
        fields.push({
          fieldName: this.formatFieldName(fieldName),
          fieldType: this.inferFieldType(fieldName),
          placeholder,
        });
      }
    }

    // Pattern 3: Common patterns like "Name: _____", "Date: _____"
    const underscorePattern = /(Name|Date|Address|Phone|Email):\s*_{2,}/gi;
    while ((match = underscorePattern.exec(text)) !== null) {
      const fieldName = match[1];
      const placeholder = match[0];

      if (fieldName) {
        fields.push({
          fieldName: this.formatFieldName(fieldName),
          fieldType: this.inferFieldType(fieldName),
          placeholder,
        });
      }
    }

    // Remove duplicates
    const uniqueFields = fields.filter(
      (field, index, self) => index === self.findIndex((f) => f.placeholder === field.placeholder)
    );

    return uniqueFields;
  }

  /**
   * Format field name to be human-readable
   */
  private formatFieldName(rawName: string): string {
    return rawName
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Infer field type based on field name
   */
  private inferFieldType(fieldName: string): FieldType {
    const name = fieldName.toLowerCase();

    if (name.includes('email')) return FieldType.EMAIL;
    if (name.includes('phone') || name.includes('mobile') || name.includes('tel'))
      return FieldType.PHONE;
    if (name.includes('date') || name.includes('birth') || name.includes('dob'))
      return FieldType.DATE;
    if (name.includes('address') || name.includes('location') || name.includes('city'))
      return FieldType.ADDRESS;
    if (name.includes('signature') || name.includes('sign')) return FieldType.SIGNATURE;
    if (name.includes('amount') || name.includes('price') || name.includes('number'))
      return FieldType.NUMBER;

    return FieldType.TEXT;
  }
}

// Create worker
const templateProcessor = new TemplateProcessor();

export const templateProcessingWorker = new Worker(
  'template-processing',
  async (job: Job<TemplateProcessJob>) => {
    await templateProcessor.processTemplate(job);
  },
  {
    connection: redisConnection,
    concurrency: 3, // Process up to 3 templates simultaneously
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per 60 seconds
    },
  }
);

templateProcessingWorker.on('completed', (job) => {
  console.log(`✅ Job completed: ${job.id}`);
});

templateProcessingWorker.on('failed', (job, err) => {
  console.error(`❌ Job failed: ${job?.id}`, err);
});

console.log('👷 Template processing worker started');
