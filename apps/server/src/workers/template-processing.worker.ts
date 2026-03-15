import { Worker, Job } from 'bullmq';
import { TemplateStatus, TemplateType, FieldType } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { s3Service } from '../services/s3.service.js';
import { redisConnection } from '../config/redis.config.js';
import { NlpService } from '../services/nlp.service.js';
import sharp from 'sharp';
import { tesseractPool } from '../lib/tesseract-pool.js';
import { createRequire } from 'module';
import { pdf } from 'pdf-to-img';

const require = createRequire(import.meta.url);

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
  async processTemplate(job: Job<TemplateProcessJob>): Promise<void> {
    const { templateId, s3Key, fileName, mimeType } = job.data;

    try {
      // First check if template exists
      const existingTemplate = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!existingTemplate) {
        console.warn(`⚠️ Template ${templateId} not found in database. Skipping processing (may have been deleted).`);
        return; 
      }

      // Update status to PROCESSING
      await prisma.template.update({
        where: { id: templateId },
        data: {
          status: TemplateStatus.PROCESSING,
          processing_started_at: new Date(),
        },
      });
      const fileBuffer = await s3Service.downloadFileAsBuffer(s3Key);

      const templateType = this.determineTemplateType(mimeType, fileBuffer);

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

      // Run NLP entity extraction
      const nlpResult = await NlpService.NLPExtraction(extractedText);

      // Detect placeholders/fields
      const detectedFields = this.detectPlaceholders(extractedText);

      // Combine NLP entities with detected fields for storage
      const nlpData = {
        entities: nlpResult.entities,
        placeholders: nlpResult.placeholders,
        extractedAt: new Date().toISOString(),
      };

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

    return TemplateType.TEXT_PDF; 
  }

  /**
   * Extract text from text-based PDF
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pages: number }> {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);

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
   * Converts PDF pages to images first, then runs OCR on each page
   */
  private async extractTextFromScannedPDF(buffer: Buffer): Promise<{ text: string; pages: number }> {
    try {
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(buffer);
      const pages = pdfData.numpages;
      
      // If there's minimal text, it's likely scanned - apply OCR
      if (pdfData.text.trim().length < 100) {
        // Convert PDF to images and run OCR
        const ocrText = await this.performOCROnPDF(buffer, pages);
        
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
   * Convert PDF pages to image buffers using pdf-to-img
   */
  private async convertPDFToImages(pdfBuffer: Buffer, scale: number = 2): Promise<Buffer[]> {
    const images: Buffer[] = [];
    const document = await pdf(pdfBuffer, { scale });
    
    for await (const image of document) {
      images.push(image);
    }
    
    return images;
  }

  /**
   * Preprocess image for OCR
   */
  private async preprocessForOCR(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .greyscale()
      .normalize()
      .modulate({ brightness: 1.1 })
      .sharpen({ sigma: 2, m1: 1, m2: 0.5 })
      .gamma(1.2)
      .toBuffer();
  }

  /**
   * Perform OCR on a PDF by converting pages to images first.
   * Uses the shared Tesseract worker pool and processes pages in parallel.
   */
  private async performOCROnPDF(buffer: Buffer, pageCount: number): Promise<string> {
    try {
      const images = await this.convertPDFToImages(buffer, 2);
      const numPages = images.length;
      
      // Preprocess all images in parallel
      const preprocessed = await Promise.all(
        images.filter((img): img is Buffer => !!img).map(img => this.preprocessForOCR(img))
      );
      
      // OCR all pages in parallel using the worker pool
      const pageTexts = await Promise.all(
        preprocessed.map(async (ppBuffer, i) => {
          const worker = await tesseractPool.acquire();
          try {
            const { data: { text } } = await worker.recognize(ppBuffer);
            return text;
          } finally {
            tesseractPool.release(worker);
          }
        })
      );
      
      const fullText = pageTexts.join('\n\n--- Page Break ---\n\n');
      return fullText.trim();
    } catch (error) {
      console.error('❌ PDF OCR failed:', error);
      throw new Error('OCR processing failed');
    }
  }

  /**
   * Perform OCR on an image buffer using Tesseract 
   */
  private async performOCR(buffer: Buffer): Promise<string> {
    const preprocessedBuffer = await this.preprocessForOCR(buffer);
    const worker = await tesseractPool.acquire();
    
    try {
      const { data: { text } } = await worker.recognize(preprocessedBuffer);
      return text;
    } catch (error) {
      console.error('❌ OCR failed:', error);
      throw new Error('OCR processing failed');
    } finally {
      tesseractPool.release(worker);
    }
  }

  /**
   * Extract text from image using OCR
   */
  private async extractTextFromImage(buffer: Buffer): Promise<string> {
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
});

templateProcessingWorker.on('failed', (job, err) => {
  console.error(`❌ Job failed: ${job?.id}`, err);
});
