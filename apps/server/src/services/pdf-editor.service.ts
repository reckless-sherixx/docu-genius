import prisma from '../lib/prisma.js';
import { s3Service } from '../services/s3.service.js';
import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from 'pdf-lib';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { fileCleanupQueue } from '../queues/file-cleanup.queue.js';
import { createRequire } from 'module';
import { pdf } from 'pdf-to-img';
import { NlpService, ExtractedEntity } from './nlp.service.js';

const require = createRequire(import.meta.url);

export class PDFEditorService {

    /**
     * Post-process OCR text 
     */
    private cleanOCRText(text: string): string {
        return text
            .replace(/^4,\s/gm, '4. ')     
            .replace(/^&\.\s/gm, '5. ')    
            .replace(/^\*\s/gm, '• ')       
            .replace(/^»\s/gm, '• ')        
            .replace(/^\+\s/gm, '• ')       
            .replace(/\|(?=[A-Za-z])/g, 'I') 
            .replace(/l(?=[A-Z])/g, 'I')   
            .replace(/0(?=[a-zA-Z]{2})/g, 'O')
            .replace(/1(?=[a-z]{2})/g, 'l') 
            .replace(/5(?=\.\s[A-Z])/g, 'S') 
            .replace(/\s{2,}/g, ' ')       
            .replace(/\n{3,}/g, '\n\n')     
            .trim();
    }

    private async convertPDFToImages(pdfBuffer: Buffer, scale: number = 2): Promise<Buffer[]> {
        const images: Buffer[] = [];
        const document = await pdf(pdfBuffer, { scale });
        
        for await (const image of document) {
            images.push(image);
        }
        
        return images;
    }

    async prepareEditablePDFWithoutText(
        templateId: string,
        organizationId: string
    ): Promise<any> {
        try {
            console.log('🔨 Creating PDF without text layer for editing:', templateId);

            const template = await prisma.template.findUnique({
                where: { id: templateId },
            });

            if (!template || !template.s3_key) {
                throw new Error('Template not found or missing S3 key');
            }

            // Download original PDF
            const originalBuffer = await s3Service.downloadFileAsBuffer(template.s3_key);
            
            // Load original PDF
            const originalDoc = await PDFDocument.load(originalBuffer);
            const originalPages = originalDoc.getPages();
            
            const isScannedPDF = template.template_type === 'SCANNED_PDF';
            console.log(`📋 Template type: ${template.template_type}, isScannedPDF: ${isScannedPDF}`);
            
            // Extract text from original PDF first using pdf-parse 
            let extractedText = '';
            let ocrTextLines: Array<{text: string, pageIndex: number, x: number, y: number, width: number, height: number, fontSize: number}> = [];
            let imageScales: Array<{width: number, height: number}> = [];
            let usedOCR = false;
            
            // Try pdf-parse first for all PDFs
            try {
                const parse = require('pdf-parse');
                const parsedPdf = await parse(originalBuffer);
                extractedText = parsedPdf.text || '';
                console.log(`📝 Extracted ${extractedText.length} characters from PDF via pdf-parse`);
            } catch (parseError) {
                console.warn('⚠️ pdf-parse failed:', parseError instanceof Error ? parseError.message : 'Unknown error');
            }

            // Determine if we need OCR: either marked as scanned OR pdf-parse got minimal text
            const needsOCR = isScannedPDF || extractedText.trim().length < 100;
            
            // Only use OCR if pdf-parse extracted minimal/no text (indicates scanned content)
            if (needsOCR && extractedText.trim().length < 100) {
                console.log('🔍 Minimal text from pdf-parse, using OCR for scanned content...');
                console.log(`📝 Current extractedText length: ${extractedText.length}`);
                try {
                    // Get image dimensions for scaling calculations
                    console.log('📸 Converting PDF pages to images...');
                    const images = await this.convertPDFToImages(originalBuffer, 2);
                    console.log(`📸 Converted ${images.length} pages to images`);
                    
                    for (const img of images) {
                        const metadata = await sharp(img).metadata();
                        imageScales.push({ width: metadata.width || 1, height: metadata.height || 1 });
                        console.log(`📐 Image size: ${metadata.width}x${metadata.height}`);
                    }
                    
                    console.log('🔤 Running OCR with positions on images...');
                    const ocrResult = await this.performOCROnPDFWithPositions(originalBuffer, originalPages.length);
                    extractedText = ocrResult.fullText;
                    ocrTextLines = ocrResult.lines;
                    usedOCR = true;
                    console.log(`✅ OCR extracted ${ocrTextLines.length} text lines from ${originalPages.length} pages`);
                    
                    // Log sample lines
                    if (ocrTextLines.length > 0) {
                        console.log(`📝 Sample OCR lines:`);
                        for (const line of ocrTextLines.slice(0, 3)) {
                            console.log(`   - "${line.text.substring(0, 40)}..." at (${line.x}, ${line.y})`);
                        }
                    } else {
                        console.log(`⚠️ No OCR lines extracted! Check Tesseract output.`);
                    }
                } catch (ocrError) {
                    console.error('❌ OCR failed:', ocrError instanceof Error ? ocrError.message : 'Unknown error');
                    console.error('❌ Full OCR error:', ocrError);
                }
            } else if (extractedText.trim().length >= 100) {
                console.log('✅ pdf-parse extracted sufficient text, skipping OCR');
            }
            
            // Run NLP extraction on the text (for both scanned and regular PDFs)
            console.log('🧠 Running NLP entity extraction...');
            let nlpEntities: ExtractedEntity[] = [];
            let nlpPlaceholders: ExtractedEntity[] = [];
            
            try {
                const nlpResult = await NlpService.NLPExtraction(extractedText);
                console.log(`📊 Raw NLP result: ${nlpResult.entities.length} entities, ${nlpResult.placeholders.length} placeholders`);
                
                // Log all entities with their confidence
                for (const e of nlpResult.entities.slice(0, 10)) {
                    console.log(`   Entity: "${e.text}" (${e.type}) confidence: ${(e.confidence * 100).toFixed(1)}%`);
                }
                
                // Filter entities with confidence > 80%
                nlpEntities = nlpResult.entities.filter(e => e.confidence >= 0.8);
                nlpPlaceholders = nlpResult.placeholders.filter(e => e.confidence >= 0.8);
                console.log(`✅ NLP found ${nlpEntities.length} entities with ≥80% confidence (filtered from ${nlpResult.entities.length})`);
                console.log(`   Entity types: ${[...new Set(nlpEntities.map(e => e.type))].join(', ') || 'none'}`);
            } catch (nlpError) {
                console.error('❌ NLP extraction failed:', nlpError instanceof Error ? nlpError.message : 'Unknown error');
            }
            
            // Create new PDF
            const newPdfDoc = await PDFDocument.create();
            const pageData = [];
            
            for (let i = 0; i < originalPages.length; i++) {
                const originalPage = originalPages[i];
                if (!originalPage) continue;
                
                const { width: pdfWidth, height: pdfHeight } = originalPage.getSize();
                
                const newPage = newPdfDoc.addPage([pdfWidth, pdfHeight]);
                
    
                console.log(`✅ Page ${i + 1} created as blank (${pdfWidth}x${pdfHeight})`);
                
                pageData.push({
                    pageNumber: i + 1,
                    width: pdfWidth,
                    height: pdfHeight,
                });
            }
            
            const pdfBytes = await newPdfDoc.save();
            const pdfBuffer = Buffer.from(pdfBytes);
            
            const pdfBase64 = pdfBuffer.toString('base64');
            const editablePdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
            
            return {
                editablePdfUrl: editablePdfDataUrl,
                editablePdfBase64: pdfBase64,
                extractedText,
                totalPages: originalPages.length,
                pages: pageData,
                // NLP entities with confidence >= 80%
                nlpEntities: nlpEntities.map(e => ({
                    type: e.type,
                    text: e.text,
                    start: e.start,
                    end: e.end,
                    confidence: e.confidence,
                })),
                nlpPlaceholders: nlpPlaceholders.map(e => ({
                    type: e.type,
                    text: e.text,
                    start: e.start,
                    end: e.end,
                    confidence: e.confidence,
                })),
            };
        } catch (error) {
            console.error('❌ Error creating editable PDF without text:', error);
            throw error;
        }
    }

    async preparePDFForEditing(templateId: string): Promise<any> {
        try {
            console.log('📝 Preparing PDF for editing:', templateId);

            const template = await prisma.template.findUnique({
                where: { id: templateId },
            });

            if (!template || !template.s3_key) {
                throw new Error('Template not found or missing S3 key');
            }

            // Download PDF from S3
            const pdfBuffer = await s3Service.downloadFileAsBuffer(template.s3_key);

            // Determine if PDF is scanned or text-based
            const isScanned = template.template_type === 'SCANNED_PDF';

            if (isScanned) {
                return await this.processScannedPDF(pdfBuffer, templateId);
            } else {
                return await this.processTextPDF(pdfBuffer, templateId);
            }
        } catch (error) {
            console.error('❌ Error preparing PDF for editing:', error);
            throw error;
        }
    }

    private async processTextPDF(pdfBuffer: Buffer, templateId: string): Promise<any> {
        console.log('📄 Processing text-based PDF');

        try {
            // Load PDF with pdf-lib
            const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();

            // Try to extract text with pdf-parse, but handle failures gracefully
            let extractedText = '';
            try {
                const parse = require('pdf-parse');
                const parsedPdf = await parse(pdfBuffer);
                extractedText = parsedPdf.text || '';
            } catch (parseError) {
                console.warn('⚠️ pdf-parse failed, continuing without extracted text:', parseError instanceof Error ? parseError.message : 'Unknown error');
            }

            const pdfData = {
                templateId,
                type: 'text',
                totalPages: pages.length,
                pages: pages.map((page, index) => ({
                    pageNumber: index + 1,
                    width: page.getWidth(),
                    height: page.getHeight(),
                })),
                extractedText,
                editable: true,
                ocrApplied: false,
            };

            console.log(`✅ Processed ${pages.length} pages`);
            return pdfData;
        } catch (error) {
            console.error('❌ Error processing text PDF:', error);
            throw error;
        }
    }

    /**
     * Process scanned PDF with OCR
     * Apply OCR to create searchable/editable text layer
     */
    private async processScannedPDF(pdfBuffer: Buffer, templateId: string): Promise<any> {
        console.log('🖼️ Processing scanned PDF with OCR');

        try {
            // Load PDF with pdf-lib
            const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();

            // Try to extract existing text first
            let ocrText = '';
            let ocrApplied = false;

            try {
                const parse = require('pdf-parse');
                const parsedPdf = await parse(pdfBuffer);
                ocrText = parsedPdf.text || '';

                // If minimal text, apply OCR
                if (ocrText.trim().length < 100) {
                    console.log('🔍 Minimal text detected, applying OCR...');
                    ocrText = await this.performOCROnPDF(pdfBuffer, pages.length);
                    ocrApplied = true;
                }
            } catch (parseError) {
                try {
                    ocrText = await this.performOCROnPDF(pdfBuffer, pages.length);
                    ocrApplied = true;
                } catch (ocrError) {
                    console.warn('⚠️ OCR also failed, continuing without text');
                }
            }

            const pdfData = {
                templateId,
                type: 'scanned',
                totalPages: pages.length,
                pages: pages.map((page, index) => ({
                    pageNumber: index + 1,
                    width: page.getWidth(),
                    height: page.getHeight(),
                })),
                extractedText: ocrText,
                editable: true,
                ocrApplied,
            };

            console.log(`✅ Processed scanned PDF with ${ocrApplied ? 'OCR' : 'existing text'}`);
            return pdfData;
        } catch (error) {
            console.error('❌ Error processing scanned PDF:', error);
            throw error;
        }
    }

    /**
     * Perform OCR on a PDF by converting pages to images first
     */
    private async performOCROnPDF(buffer: Buffer, pageCount: number): Promise<string> {
        console.log(`🔤 Running OCR on PDF pages...`);
        
        try {
            // Convert all PDF pages to images
            console.log(`📄 Converting PDF pages to images...`);
            const images = await this.convertPDFToImages(buffer, 3); // Higher scale for better OCR
            const numPages = images.length;
            
            console.log(`✅ Converted ${numPages} pages to images`);
            
            const worker = await createWorker('eng', 1, {
                langPath: 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main',
                gzip: false,
            });
            let fullText = '';
            await worker.setParameters({
                preserve_interword_spaces: '1',
            });
            
            try {
                for (let i = 0; i < numPages; i++) {
                    const imageBuffer = images[i];
                    if (!imageBuffer) continue;
            
                    const preprocessedBuffer = await sharp(imageBuffer)
                        .greyscale()                              // Convert to grayscale
                        .normalize()                              // Auto-level contrast
                        .modulate({ brightness: 1.1 })            // Slightly brighten
                        .sharpen({ sigma: 2, m1: 1, m2: 0.5 })    // Sharpen text edges
                        .gamma(1.2)                               // Adjust gamma for better contrast
                        .toBuffer();
                    
                    console.log(`🔍 Running OCR on page ${i + 1}/${numPages}...`);
                    const { data: { text } } = await worker.recognize(preprocessedBuffer);
                    
                    // Clean up common OCR errors
                    const cleanedText = this.cleanOCRText(text);
                    fullText += cleanedText + '\n\n--- Page Break ---\n\n';
                }
            } finally {
                await worker.terminate();
            }
            
            console.log(`✅ OCR completed, extracted ${fullText.length} characters from ${numPages} pages`);
            
            return this.cleanOCRText(fullText.trim());
        } catch (error) {
            console.error('❌ PDF OCR failed:', error);
            throw new Error('OCR processing failed');
        }
    }

    private async performOCROnPDFWithPositions(buffer: Buffer, pageCount: number): Promise<{
        fullText: string;
        lines: Array<{text: string, pageIndex: number, x: number, y: number, width: number, height: number, fontSize: number}>;
    }> {
        console.log(`🔤 Running OCR with positions on PDF pages...`);
        
        try {
            // Convert all PDF pages to images at higher resolution for better OCR
            console.log(`📄 Converting PDF pages to images for OCR...`);
            const images = await this.convertPDFToImages(buffer, 3); // Scale 3 = 300 DPI equivalent
            const numPages = images.length;
            
            console.log(`✅ Converted ${numPages} pages to images`);
            
            // Use tessdata_best for higher accuracy (slower but more accurate)
            const worker = await createWorker('eng', 1, {
                langPath: 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main',
                gzip: false,
            });
            let fullText = '';
            const allLines: Array<{text: string, pageIndex: number, x: number, y: number, width: number, height: number, fontSize: number}> = [];
            
            // Set Tesseract parameters for better accuracy
            await worker.setParameters({
                preserve_interword_spaces: '1',  // Preserve spacing
            });
            
            try {
                for (let i = 0; i < numPages; i++) {
                    const imageBuffer = images[i];
                    if (!imageBuffer) continue;
                    
                    // Get image dimensions for scaling
                    const imageMetadata = await sharp(imageBuffer).metadata();
                    const imageWidth = imageMetadata.width || 1;
                    const imageHeight = imageMetadata.height || 1;
                    
                    // Better preprocessing for OCR - avoid harsh binarization
                    const preprocessedBuffer = await sharp(imageBuffer)
                        .greyscale()                        // Convert to grayscale
                        .normalize()                        // Auto-level contrast
                        .modulate({ brightness: 1.1 })      // Slightly brighten
                        .sharpen({ sigma: 2, m1: 1, m2: 0.5 }) // Sharpen text edges
                        .gamma(1.2)                         // Adjust gamma for better contrast
                        .toBuffer();
                    
                    console.log(`🔍 Running OCR on page ${i + 1}/${numPages}...`);
                    const result = await worker.recognize(preprocessedBuffer);
                    const data = result.data as any;
                    
                    console.log(`📊 Tesseract data keys: ${Object.keys(data).join(', ')}`);
                    console.log(`📊 data.lines exists: ${!!data.lines}, is array: ${Array.isArray(data.lines)}, length: ${data.lines?.length || 0}`);
                    
                    // Extract lines with bounding box positions
                    if (data.lines && Array.isArray(data.lines)) {
                        console.log(`📝 Processing ${data.lines.length} lines from page ${i + 1}`);
                        for (const line of data.lines) {
                            if (line.text.trim().length === 0) continue;
                            
                            const bbox = line.bbox;
                            console.log(`   Line: "${line.text.substring(0, 30)}..." bbox: ${JSON.stringify(bbox)}`);
                            // Calculate approximate font size from line height
                            const lineHeight = bbox.y1 - bbox.y0;
                            const fontSize = Math.max(8, Math.min(24, lineHeight * 0.7));
                            
                            allLines.push({
                                text: line.text.trim(),
                                pageIndex: i,
                                x: bbox.x0,
                                y: bbox.y0,
                                width: bbox.x1 - bbox.x0,
                                height: lineHeight,
                                fontSize: fontSize,
                            });
                        }
                    } else {
                        console.log(`⚠️ No lines array found in Tesseract result for page ${i + 1}`);
                    }
                    
                    fullText += data.text + '\n\n';
                }
            } finally {
                await worker.terminate();
            }
            
            console.log(`✅ OCR completed, extracted ${allLines.length} positioned lines from ${numPages} pages`);
            
            // Clean the text and also clean each line
            const cleanedLines = allLines.map(line => ({
                ...line,
                text: this.cleanOCRText(line.text)
            }));
            
            return { fullText: this.cleanOCRText(fullText.trim()), lines: cleanedLines };
        } catch (error) {
            console.error('❌ PDF OCR with positions failed:', error);
            throw new Error('OCR processing failed');
        }
    }

    /**
     * Perform OCR on an image buffer using Tesseract
     */
    private async performOCR(buffer: Buffer): Promise<string> {
        console.log('🔤 Running OCR with Tesseract (tessdata_best)...');

        // Use tessdata_best for higher accuracy
        const worker = await createWorker('eng', 1, {
            langPath: 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main',
            gzip: false,
        });

        try {
            // Preprocess with Sharp for better OCR accuracy
            // Avoid harsh binarization which causes character misrecognition
            const preprocessedBuffer = await sharp(buffer)
                .greyscale()                              // Convert to grayscale
                .normalize()                              // Auto-level contrast
                .modulate({ brightness: 1.1 })            // Slightly brighten
                .sharpen({ sigma: 2, m1: 1, m2: 0.5 })    // Sharpen text edges
                .gamma(1.2)                               // Adjust gamma
                .toBuffer();

            const {
                data: { text },
            } = await worker.recognize(preprocessedBuffer);

            console.log(`✅ OCR completed, extracted ${text.length} characters`);

            return this.cleanOCRText(text);
        } catch (error) {
            console.error('❌ OCR failed:', error);
            throw new Error('OCR processing failed');
        } finally {
            await worker.terminate();
        }
    }

    /**
     * Save edited PDF
     * Creates new version and schedules for deletion
     */
    async saveEditedPDF(
        templateId: string,
        editedContent: any,
        organizationId: string
    ): Promise<any> {
        try {
        // Get original template
            const originalTemplate = await prisma.template.findUnique({
                where: { id: templateId },
            });

            if (!originalTemplate || !originalTemplate.s3_key) {
                throw new Error('Original template not found');
            }

            // Download original PDF
            const originalBuffer = await s3Service.downloadFileAsBuffer(originalTemplate.s3_key);

            // Generate edited PDF
            const editedPdfBuffer = await this.generatePDFFromEdits(originalBuffer, editedContent);

            // Upload to S3 with unique key
            const timestamp = Date.now();
            const fileName = `Edited - ${originalTemplate.template_name}`;
            const s3Key = `templates/${organizationId}/edited-${timestamp}.pdf`;

            // Upload buffer directly to S3
            await s3Service.uploadFile(s3Key, editedPdfBuffer, 'application/pdf');

            // Save to database with expiration (2 hours)
            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

            const editedTemplate = await prisma.template.create({
                data: {
                    template_name: fileName,
                    template_description: 'Edited PDF (expires in 2 hours)',
                    s3_key: s3Key,
                    file_size: BigInt(editedPdfBuffer.length),
                    mime_type: 'application/pdf',
                    status: 'COMPLETED',
                    category: originalTemplate.category || 'GENERAL',
                    organization_id: organizationId,
                    is_temporary: true,
                    expires_at: expiresAt,
                    parent_template_id: templateId,
                },
            });

            // Schedule deletion after 2 hours
            await this.scheduleFileDeletion(editedTemplate.id, expiresAt);

            return {
                templateId: editedTemplate.id,
                downloadUrl: await s3Service.generatePresignedDownloadUrl(s3Key, 7200), // 2 hours
                expiresAt,
            };
        } catch (error) {
            console.error('❌ Error saving edited PDF:', error);
            throw error;
        }
    }

    async saveEditablePDF(
        templateId: string,
        textElements: any[],
        deletedElements: any[],
        organizationId: string,
        imageElements: any[] = [],
        documentNumber?: string
    ): Promise<any> {
        try {
            // Get original template
            const originalTemplate = await prisma.template.findUnique({
                where: { id: templateId },
            });

            if (!originalTemplate || !originalTemplate.s3_key) {
                throw new Error('Original template not found');
            }

            // Download original PDF
            const originalBuffer = await s3Service.downloadFileAsBuffer(originalTemplate.s3_key);

            // Generate new PDF with modified text and images
            const editedPdfBuffer = await this.rebuildPDFWithTextAndImages(
                originalBuffer,
                textElements,
                deletedElements,
                imageElements,
                documentNumber
            );

            const timestamp = Date.now();
            const fileName = `Edited - ${originalTemplate.template_name}`;
            const s3Key = `templates/${organizationId}/edited-${timestamp}.pdf`;
            const textElementsS3Key = `templates/${organizationId}/edited-${timestamp}-elements.json`;

            // Upload PDF buffer to S3
            await s3Service.uploadFile(s3Key, editedPdfBuffer, 'application/pdf');

            const elementsJson = JSON.stringify({
                textElements,
                imageElements,
                deletedElements,
                savedAt: new Date().toISOString(),
            });
            await s3Service.uploadFile(textElementsS3Key, Buffer.from(elementsJson), 'application/json');

            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

            const editedTemplate = await prisma.template.create({
                data: {
                    template_name: fileName,
                    template_description: 'Edited PDF (expires in 2 hours)',
                    s3_key: s3Key,
                    file_size: BigInt(editedPdfBuffer.length),
                    mime_type: 'application/pdf',
                    status: 'COMPLETED',
                    category: originalTemplate.category || 'GENERAL',
                    organization_id: organizationId,
                    is_temporary: true,
                    expires_at: expiresAt,
                    parent_template_id: templateId,
                    extracted_text: textElementsS3Key,
                },
            });

            // Schedule deletion after 2 hours
            await this.scheduleFileDeletion(editedTemplate.id, expiresAt);

            return {
                templateId: editedTemplate.id,
                downloadUrl: await s3Service.generatePresignedDownloadUrl(s3Key, 7200),
                expiresAt,
            };
        } catch (error) {
            console.error('❌ Error saving editable PDF:', error);
            throw error;
        }
    }

    private async rebuildPDFWithText(
        originalBuffer: Buffer,
        textElements: any[],
        deletedElements: any[]
    ): Promise<Buffer> {
        try {
            // Load original PDF
            const originalDoc = await PDFDocument.load(originalBuffer);
            const originalPages = originalDoc.getPages();
            
            // Create new PDF document
            const newPdfDoc = await PDFDocument.create();

            // Process each page
            for (let pageNum = 1; pageNum <= originalPages.length; pageNum++) {
                const originalPage = originalPages[pageNum - 1];
                if (!originalPage) continue;
                
                const { width, height } = originalPage.getSize();

                // Create new blank page
                const newPage = newPdfDoc.addPage([width, height]);

                const embeddedPage = await newPdfDoc.embedPage(originalPage);
                newPage.drawPage(embeddedPage, {
                    x: 0,
                    y: 0,
                    width,
                    height,
                });

                // Get text elements for this page
                const pageElements = textElements.filter(el => el.page === pageNum);
                const activeElements = pageElements.filter(element => {
                    const isDeleted = deletedElements.some(
                        del => del.id === element.id && del.page === pageNum
                    );
                    return !isDeleted;
                });

                for (const element of activeElements) {
                    const padding = 4; 
                    const rectX = Math.max(0, (element.x / 2) - padding);
                    const rectHeight = (element.height / 2) + (padding * 2);
                    const rectY = height - (element.y / 2) - rectHeight + padding;
                    const rectWidth = (element.width / 2) + (padding * 2);

                    newPage.drawRectangle({
                        x: rectX,
                        y: rectY,
                        width: rectWidth,
                        height: rectHeight,
                        color: rgb(1, 1, 1), 
                        borderWidth: 0,
                    });
                }

                // Also cover deleted elements 
                const deletedOnPage = deletedElements.filter(del => del.page === pageNum);
                for (const element of deletedOnPage) {
                    const originalElement = textElements.find(
                        te => te.id === element.id && te.page === pageNum
                    );
                    if (originalElement) {
                        const padding = 4;
                        const rectX = Math.max(0, (originalElement.x / 2) - padding);
                        const rectHeight = (originalElement.height / 2) + (padding * 2);
                        const rectY = height - (originalElement.y / 2) - rectHeight + padding;
                        const rectWidth = (originalElement.width / 2) + (padding * 2);

                        newPage.drawRectangle({
                            x: rectX,
                            y: rectY,
                            width: rectWidth,
                            height: rectHeight,
                            color: rgb(1, 1, 1),
                            borderWidth: 0,
                        });
                    }
                }

                // Draw new text on top
                for (const element of activeElements) {
                    await this.addTextElement(newPdfDoc, newPage, element);
                }
            }

            // Save the new PDF
            const pdfBytes = await newPdfDoc.save();
            
            return Buffer.from(pdfBytes);
        } catch (error) {
            console.error('❌ Error rebuilding PDF:', error);
            throw error;
        }
    }

    private async rebuildPDFWithTextAndImages(
        originalBuffer: Buffer,
        textElements: any[],
        deletedElements: any[],
        imageElements: any[],
        documentNumber?: string
    ): Promise<Buffer> {
        try {
            // Load original PDF
            const originalDoc = await PDFDocument.load(originalBuffer);
            const originalPages = originalDoc.getPages();
            
            // Create new PDF document
            const newPdfDoc = await PDFDocument.create();

            // Embed font for document number
            const helveticaFont = await newPdfDoc.embedFont(StandardFonts.Helvetica);

            // Process each page
            for (let pageNum = 1; pageNum <= originalPages.length; pageNum++) {
                const originalPage = originalPages[pageNum - 1];
                if (!originalPage) continue;
                
                const { width, height } = originalPage.getSize();

                // Create new blank page
                const newPage = newPdfDoc.addPage([width, height]);

                // Embed the original page (includes images, graphics, AND original text)
                const embeddedPage = await newPdfDoc.embedPage(originalPage);
                newPage.drawPage(embeddedPage, {
                    x: 0,
                    y: 0,
                    width,
                    height,
                });

                // Get text elements for this page
                const pageTextElements = textElements.filter(el => el.page === pageNum);
                const activeTextElements = pageTextElements.filter(element => {
                    const isDeleted = deletedElements.some(
                        del => del.id === element.id && del.page === pageNum
                    );
                    return !isDeleted;
                });

                for (const element of activeTextElements) {
                    const padding = 4; 
                    const rectX = Math.max(0, (element.x / 2) - padding);
                    const rectHeight = (element.height / 2) + (padding * 2);
                    const rectY = height - (element.y / 2) - rectHeight + padding;
                    const rectWidth = (element.width / 2) + (padding * 2);

                    newPage.drawRectangle({
                        x: rectX,
                        y: rectY,
                        width: rectWidth,
                        height: rectHeight,
                        color: rgb(1, 1, 1), 
                        borderWidth: 0,
                    });
                }

                // Cover deleted elements 
                const deletedOnPage = deletedElements.filter(del => del.page === pageNum);
                for (const element of deletedOnPage) {
                    const originalElement = textElements.find(
                        te => te.id === element.id && te.page === pageNum
                    );
                    if (originalElement) {
                        const padding = 4;
                        const rectX = Math.max(0, (originalElement.x / 2) - padding);
                        const rectHeight = (originalElement.height / 2) + (padding * 2);
                        const rectY = height - (originalElement.y / 2) - rectHeight + padding;
                        const rectWidth = (originalElement.width / 2) + (padding * 2);

                        newPage.drawRectangle({
                            x: rectX,
                            y: rectY,
                            width: rectWidth,
                            height: rectHeight,
                            color: rgb(1, 1, 1),
                            borderWidth: 0,
                        });
                    }
                }

                // Draw new text on top
                for (const element of activeTextElements) {
                    await this.addTextElement(newPdfDoc, newPage, element);
                }

                // Draw images/signatures on this page
                const pageImages = imageElements.filter(img => img.page === pageNum);
                for (const imageEl of pageImages) {
                    await this.addImageElement(newPdfDoc, newPage, imageEl, height);
                }

                // Add document number on first page (top-right corner)
                if (pageNum === 1 && documentNumber) {
                    const fontSize = 10;
                    const textWidth = helveticaFont.widthOfTextAtSize(documentNumber, fontSize);
                    const padding = 15;
                    
                    newPage.drawText(documentNumber, {
                        x: width - textWidth - padding,
                        y: height - padding - fontSize,
                        size: fontSize,
                        font: helveticaFont,
                        color: rgb(0.4, 0.4, 0.4),
                    });
                }
            }

            // Save the new PDF
            const pdfBytes = await newPdfDoc.save();
            
            return Buffer.from(pdfBytes);
        } catch (error) {
            console.error('❌ Error rebuilding PDF with images:', error);
            throw error;
        }
    }

    private async addImageElement(pdfDoc: PDFDocument, page: PDFPage, element: any, pageHeight: number): Promise<void> {
        try {
            const { dataUrl, x, y, width, height } = element;
            
            console.log(`🖼️ Processing image element:`, {
                id: element.id,
                type: element.type,
                x, y, width, height,
                hasDataUrl: !!dataUrl,
                dataUrlLength: dataUrl?.length || 0
            });
            
            if (!dataUrl) {
                console.warn('⚠️ Image element missing dataUrl, skipping');
                return;
            }

            // Extract base64 data from data URL
            const base64Match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
            if (!base64Match) {
                console.warn('⚠️ Invalid dataUrl format, skipping');
                return;
            }
            
            const imageType = base64Match[1];
            const base64Data = base64Match[2];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            console.log(`🖼️ Image type: ${imageType}, buffer size: ${imageBuffer.length}`);

            // Determine image type and embed
            let embeddedImage;
            if (imageType === 'png') {
                embeddedImage = await pdfDoc.embedPng(imageBuffer);
            } else {
                embeddedImage = await pdfDoc.embedJpg(imageBuffer);
            }

            const imgX = x / 2;
            const imgWidth = width / 2;
            const imgHeight = height / 2;
            const imgY = pageHeight - (y / 2) - imgHeight;

            // Draw the image
            page.drawImage(embeddedImage, {
                x: imgX,
                y: imgY,
                width: imgWidth,
                height: imgHeight,
            });

            console.log(`Added ${element.type || 'image'} at (${imgX}, ${imgY}) size ${imgWidth}x${imgHeight}`);
        } catch (error) {
            console.error('Error adding image element:', error);
        }
    }


    private async addTextElement(pdfDoc: PDFDocument, page: PDFPage, element: any): Promise<void> {
        try {
            let font: any;
            const fontFamily = element.fontFamily?.toLowerCase() || 'arial';
            const isBold = element.isBold === true;
            const isItalic = element.isItalic === true;
            
           
            if (fontFamily.includes('times')) {
                if (isBold && isItalic) {
                    font = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
                } else if (isBold) {
                    font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
                } else if (isItalic) {
                    font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
                } else {
                    font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
                }
            } else if (fontFamily.includes('courier')) {
                if (isBold && isItalic) {
                    font = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);
                } else if (isBold) {
                    font = await pdfDoc.embedFont(StandardFonts.CourierBold);
                } else if (isItalic) {
                    font = await pdfDoc.embedFont(StandardFonts.CourierOblique);
                } else {
                    font = await pdfDoc.embedFont(StandardFonts.Courier);
                }
            } else {
                // Default to Helvetica (Arial equivalent)
                if (isBold && isItalic) {
                    font = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
                } else if (isBold) {
                    font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                } else if (isItalic) {
                    font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
                } else {
                    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                }
            }
            
            const fontSize = element.fontSize / 2;
            const color = this.hexToRgb(element.color || '#000000');

            const pageHeight = page.getHeight();
            const x = element.x / 2;
            const y = pageHeight - (element.y / 2) - fontSize;

            // Handle text alignment
            let adjustedX = x;
            if (element.textAlign === 'center') {
                const textWidth = font.widthOfTextAtSize(element.text, fontSize);
                adjustedX = x + (element.width / 4) - (textWidth / 2);
            } else if (element.textAlign === 'right') {
                const textWidth = font.widthOfTextAtSize(element.text, fontSize);
                adjustedX = x + (element.width / 2) - textWidth;
            }

            // Draw text on NEW PDF
            page.drawText(element.text, {
                x: adjustedX,
                y,
                size: fontSize,
                font,
                color: rgb(color.r, color.g, color.b),
                rotate: degrees(element.angle || 0),
            });

            // Draw underline if needed
            if (element.isUnderline) {
                const textWidth = font.widthOfTextAtSize(element.text, fontSize);
                page.drawLine({
                    start: { x: adjustedX, y: y - 2 },
                    end: { x: adjustedX + textWidth, y: y - 2 },
                    thickness: fontSize * 0.05,
                    color: rgb(color.r, color.g, color.b),
                });
            }

            console.log(`Text added successfully at (${adjustedX.toFixed(2)}, ${y.toFixed(2)})`);
        } catch (error) {
            console.error('Error adding text to new PDF:', error);
        }
    }

    /**
     * Generate PDF from edits using pdf-lib
     */
    private async generatePDFFromEdits(
        originalBuffer: Buffer,
        editedContent: any
    ): Promise<Buffer> {
        try {
            // Load original PDF
            const pdfDoc = await PDFDocument.load(originalBuffer);
            const pages = pdfDoc.getPages();

            if (editedContent?.edits && Array.isArray(editedContent.edits)) {
                for (const edit of editedContent.edits) {
                    await this.applyEdit(pdfDoc, pages, edit);
                }
            }

            // Save the PDF
            const pdfBytes = await pdfDoc.save();
            return Buffer.from(pdfBytes);
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        }
    }

    /**
     * Apply individual edit to PDF
     */
    private async applyEdit(pdfDoc: PDFDocument, pages: PDFPage[], edit: any): Promise<void> {
        const page = pages[edit.page - 1];
        if (!page) {
            console.warn(`Page ${edit.page} not found, skipping edit`);
            return;
        }

        switch (edit.type) {
            case 'text':
                await this.addTextToPage(pdfDoc, page, edit);
                break;
            case 'image':
                await this.addImageToPage(pdfDoc, page, edit);
                break;
            case 'signature':
                await this.addSignatureToPage(pdfDoc, page, edit);
                break;
            case 'highlight':
                await this.addHighlightToPage(page, edit);
                break;
            case 'shape':
                await this.addShapeToPage(page, edit);
                break;
            default:
                console.warn(`Unknown edit type: ${edit.type}`);
        }
    }

    /**
     * Add text to PDF page
     */
    private async addTextToPage(pdfDoc: PDFDocument, page: PDFPage, edit: any): Promise<void> {
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = edit.style?.fontSize || 12;
        const color = this.hexToRgb(edit.style?.color || '#000000');

        page.drawText(edit.text, {
            x: edit.position.x,
            y: page.getHeight() - edit.position.y, 
            size: fontSize,
            font,
            color: rgb(color.r, color.g, color.b),
        });
    }

    /**
     * Add image to PDF page
     */
    private async addImageToPage(pdfDoc: PDFDocument, page: PDFPage, edit: any): Promise<void> {
        console.log(' Adding image to page:', edit.position);
    }

    /**
     * Add signature to PDF page
     */
    private async addSignatureToPage(
        pdfDoc: PDFDocument,
        page: PDFPage,
        edit: any
    ): Promise<void> {
        console.log(' Adding signature to page:', edit.position);
    }

    /**K
     * Add highlight to PDF page
     */
    private async addHighlightToPage(page: PDFPage, edit: any): Promise<void> {
        const color = this.hexToRgb(edit.color || '#FFFF00');

        page.drawRectangle({
            x: edit.coordinates.x,
            y: page.getHeight() - edit.coordinates.y,
            width: edit.coordinates.width,
            height: edit.coordinates.height,
            color: rgb(color.r, color.g, color.b),
            opacity: 0.3,
        });
    }

    /**
     * Add shape to PDF page
     */
    private async addShapeToPage(page: PDFPage, edit: any): Promise<void> {
        const strokeColor = this.hexToRgb(edit.style?.strokeColor || '#000000');

        if (edit.shapeType === 'rectangle') {
            page.drawRectangle({
                x: edit.coordinates.x,
                y: page.getHeight() - edit.coordinates.y,
                width: edit.coordinates.width,
                height: edit.coordinates.height,
                borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
                borderWidth: edit.style?.strokeWidth || 1,
            });
        } else if (edit.shapeType === 'circle') {
            page.drawCircle({
                x: edit.coordinates.x + edit.coordinates.width / 2,
                y: page.getHeight() - edit.coordinates.y - edit.coordinates.height / 2,
                size: edit.coordinates.width / 2,
                borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
                borderWidth: edit.style?.strokeWidth || 1,
            });
        }
    }

    /**
     * Convert hex color to RGB
     */
    private hexToRgb(hex: string): { r: number; g: number; b: number } {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result && result[1] && result[2] && result[3]
            ? {
                r: parseInt(result[1], 16) / 255,
                g: parseInt(result[2], 16) / 255,
                b: parseInt(result[3], 16) / 255,
            }
            : { r: 0, g: 0, b: 0 };
    }

    /**
     * Schedule file deletion after expiration
     */
    private async scheduleFileDeletion(templateId: string, expiresAt: Date): Promise<void> {
        const delay = expiresAt.getTime() - Date.now();

        await fileCleanupQueue.add(
            'cleanup-expired-file',
            { templateId },
            {
                delay: delay > 0 ? delay : 0,
                removeOnComplete: true,
            }
        );

        console.log(`⏰ Scheduled deletion for template ${templateId} at ${expiresAt}`);
    }
}

export const pdfEditorService = new PDFEditorService();
