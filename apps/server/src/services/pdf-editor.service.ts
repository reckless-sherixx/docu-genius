import prisma from '../lib/prisma.js';
import { s3Service } from '../services/s3.service.js';
import { PDFDocument, rgb, StandardFonts, degrees, PDFPage, PDFFont } from 'pdf-lib';
import sharp from 'sharp';
import { tesseractPool } from '../lib/tesseract-pool.js';
import { fileCleanupQueue } from '../queues/file-cleanup.queue.js';
import { createRequire } from 'module';
import { pdf } from 'pdf-to-img';
import { NlpService, ExtractedEntity } from './nlp.service.js';

const require = createRequire(import.meta.url);

// Reusable font cache per PDF document build
type FontCache = Map<string, PDFFont>;

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
            } catch (parseError) {
                console.warn('⚠️ pdf-parse failed:', parseError instanceof Error ? parseError.message : 'Unknown error');
            }

            // Determine if we need OCR: either marked as scanned OR pdf-parse got minimal text
            const needsOCR = isScannedPDF || extractedText.trim().length < 100;
            
            // Only use OCR if pdf-parse extracted minimal/no text (indicates scanned content)
            if (needsOCR && extractedText.trim().length < 100) {
                try {
                    // Get image dimensions for scaling calculations
                    const images = await this.convertPDFToImages(originalBuffer, 2);
                    
                    // Get image metadata in parallel
                    const metadataPromises = images.map(img => sharp(img).metadata());
                    const metadataResults = await Promise.all(metadataPromises);
                    for (const metadata of metadataResults) {
                        imageScales.push({ width: metadata.width || 1, height: metadata.height || 1 });
                    }

                    // Pass pre-converted images to avoid re-converting
                    const ocrResult = await this.performOCROnPDFWithPositions(originalBuffer, originalPages.length, images);
                    extractedText = ocrResult.fullText;
                    ocrTextLines = ocrResult.lines;
                    usedOCR = true;
                } catch (ocrError) {
                    console.error('❌ OCR failed:', ocrError instanceof Error ? ocrError.message : 'Unknown error');
                    console.error('❌ Full OCR error:', ocrError);
                }
            }
            
            // Run NLP extraction on the text (for both scanned and regular PDFs)
            let nlpEntities: ExtractedEntity[] = [];
            let nlpPlaceholders: ExtractedEntity[] = [];
            
            try {
                const nlpResult = await NlpService.NLPExtraction(extractedText);

                // Filter entities with confidence > 80%
                nlpEntities = nlpResult.entities.filter(e => e.confidence >= 0.8);
                nlpPlaceholders = nlpResult.placeholders.filter(e => e.confidence >= 0.8);
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
            return pdfData;
        } catch (error) {
            console.error('❌ Error processing scanned PDF:', error);
            throw error;
        }
    }

    /**
     * Preprocess image for OCR (shared pipeline)
     */
    private async preprocessForOCR(imageBuffer: Buffer): Promise<Buffer> {
        return sharp(imageBuffer)
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
            const images = await this.convertPDFToImages(buffer, 2); // scale 2 is sufficient for OCR
            const numPages = images.length;
            
            // Preprocess all images in parallel
            const preprocessPromises = images
                .filter((img): img is Buffer => !!img)
                .map(img => this.preprocessForOCR(img));
            const preprocessed = await Promise.all(preprocessPromises);
            
            // Process pages in parallel using the worker pool
            const pageTexts = await Promise.all(
                preprocessed.map(async (ppBuffer, i) => {
                    const worker = await tesseractPool.acquire();
                    try {
                        const { data: { text } } = await worker.recognize(ppBuffer);
                        return this.cleanOCRText(text);
                    } finally {
                        tesseractPool.release(worker);
                    }
                })
            );
            
            const fullText = pageTexts.join('\n\n--- Page Break ---\n\n');
            
            return this.cleanOCRText(fullText.trim());
        } catch (error) {
            console.error('❌ PDF OCR failed:', error);
            throw new Error('OCR processing failed');
        }
    }

    /**
     * Perform OCR with position data on a single page image.
     */
    private async ocrPageWithPositions(
        imageBuffer: Buffer,
        pageIndex: number
    ): Promise<{
        text: string;
        lines: Array<{text: string, pageIndex: number, x: number, y: number, width: number, height: number, fontSize: number}>;
    }> {
        const preprocessedBuffer = await this.preprocessForOCR(imageBuffer);
        const worker = await tesseractPool.acquire();
        try {
            const result = await worker.recognize(preprocessedBuffer);
            const data = result.data as any;
            const lines: Array<{text: string, pageIndex: number, x: number, y: number, width: number, height: number, fontSize: number}> = [];

            if (data.lines && Array.isArray(data.lines)) {
                for (const line of data.lines) {
                    if (line.text.trim().length === 0) continue;
                    const bbox = line.bbox;
                    const lineHeight = bbox.y1 - bbox.y0;
                    lines.push({
                        text: line.text.trim(),
                        pageIndex,
                        x: bbox.x0,
                        y: bbox.y0,
                        width: bbox.x1 - bbox.x0,
                        height: lineHeight,
                        fontSize: Math.max(8, Math.min(24, lineHeight * 0.7)),
                    });
                }
            }
            return { text: data.text || '', lines };
        } finally {
            tesseractPool.release(worker);
        }
    }

    /**
     * Perform OCR with positions on all PDF pages in parallel.
     * Accepts optional pre-converted images to avoid re-converting.
     */
    private async performOCROnPDFWithPositions(
        buffer: Buffer,
        pageCount: number,
        preConvertedImages?: Buffer[]
    ): Promise<{
        fullText: string;
        lines: Array<{text: string, pageIndex: number, x: number, y: number, width: number, height: number, fontSize: number}>;
    }> {
        try {
            const images = preConvertedImages ?? await this.convertPDFToImages(buffer, 2);
            const numPages = images.length;
            
            // Process all pages in parallel via worker pool
            const pageResults = await Promise.all(
                images.map((img, i) => {
                    if (!img) return Promise.resolve({ text: '', lines: [] as any[] });
                    return this.ocrPageWithPositions(img, i);
                })
            );
            
            const allLines = pageResults.flatMap(r => r.lines);
            const fullText = pageResults.map(r => r.text).join('\n\n');
            
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
     * Perform OCR on an image buffer using Tesseract (uses worker pool)
     */
    private async performOCR(buffer: Buffer): Promise<string> {
        const preprocessedBuffer = await this.preprocessForOCR(buffer);
        const worker = await tesseractPool.acquire();

        try {
            const { data: { text } } = await worker.recognize(preprocessedBuffer);
            return this.cleanOCRText(text);
        } catch (error) {
            console.error('❌ OCR failed:', error);
            throw new Error('OCR processing failed');
        } finally {
            tesseractPool.release(worker);
        }
    }

    /**
     * Clean up previous temporary templates for the same parent template.
     * Deletes both S3 files and DB records to prevent orphaned files.
     */
    private async cleanupOldTempTemplates(parentTemplateId: string): Promise<void> {
        const oldTempTemplates = await prisma.template.findMany({
            where: {
                parent_template_id: parentTemplateId,
                is_temporary: true,
            },
        });

        if (oldTempTemplates.length === 0) return;

        await Promise.all(
            oldTempTemplates.map(async (oldTemplate) => {
                try {
                    const deletePromises: Promise<void>[] = [];
                    if (oldTemplate.s3_key) {
                        deletePromises.push(s3Service.deleteFile(oldTemplate.s3_key));
                    }
                    // Also delete the companion JSON elements file if present
                    if (oldTemplate.extracted_text?.endsWith('-elements.json')) {
                        deletePromises.push(s3Service.deleteFile(oldTemplate.extracted_text));
                    }
                    await Promise.all(deletePromises);
                    await prisma.template.delete({ where: { id: oldTemplate.id } });
                } catch (cleanupErr) {
                    console.warn(`⚠️ Failed to clean up old temp template ${oldTemplate.id}:`, cleanupErr);
                }
            })
        );
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

            // Clean up previous temporary versions before creating a new one
            await this.cleanupOldTempTemplates(templateId);

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

            // Save to database with expiration 
            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

            let editedTemplate;
            try {
                editedTemplate = await prisma.template.create({
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
            } catch (dbError) {
                // Rollback: delete orphaned S3 file if DB write fails
                await s3Service.deleteFile(s3Key).catch(() => {});
                throw dbError;
            }

            // Schedule deletion after 2 hours
            this.scheduleFileDeletion(editedTemplate.id, expiresAt).catch(err =>
                console.error('Failed to schedule file deletion:', err)
            );

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

            // Clean up previous temporary versions before creating a new one
            await this.cleanupOldTempTemplates(templateId);

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

            const elementsJson = JSON.stringify({
                textElements,
                imageElements,
                deletedElements,
                savedAt: new Date().toISOString(),
            });

            // Upload both files to S3 in parallel
            await Promise.all([
                s3Service.uploadFile(s3Key, editedPdfBuffer, 'application/pdf'),
                s3Service.uploadFile(textElementsS3Key, Buffer.from(elementsJson), 'application/json'),
            ]);

            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

            let editedTemplate;
            let downloadUrl: string;
            try {
                // Create DB record and generate presigned URL in parallel
                [editedTemplate, downloadUrl] = await Promise.all([
                    prisma.template.create({
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
                    }),
                    s3Service.generatePresignedDownloadUrl(s3Key, 7200),
                ]);
            } catch (dbError) {
                // Rollback: delete orphaned S3 files if DB write fails
                await Promise.all([
                    s3Service.deleteFile(s3Key).catch(() => {}),
                    s3Service.deleteFile(textElementsS3Key).catch(() => {}),
                ]);
                throw dbError;
            }

            // Schedule deletion after 2 hours (fire and forget)
            this.scheduleFileDeletion(editedTemplate.id, expiresAt).catch(err =>
                console.error('Failed to schedule file deletion:', err)
            );

            return {
                templateId: editedTemplate.id,
                downloadUrl,
                expiresAt,
            };
        } catch (error) {
            console.error('❌ Error saving editable PDF:', error);
            throw error;
        }
    }

    /**
     * Generate a document PDF and upload directly to S3.
     * Unlike saveEditablePDF, this does NOT create a temporary template record,
     * avoiding unnecessary DB rows and extra S3 files (JSON elements).
     */
    async generateDocumentPDF(
        templateId: string,
        textElements: any[],
        organizationId: string,
        imageElements: any[] = [],
        documentNumber: string
    ): Promise<{ s3Key: string; downloadUrl: string }> {
        const originalTemplate = await prisma.template.findUnique({
            where: { id: templateId },
        });

        if (!originalTemplate || !originalTemplate.s3_key) {
            throw new Error('Original template not found');
        }

        // Download and rebuild PDF
        const originalBuffer = await s3Service.downloadFileAsBuffer(originalTemplate.s3_key);
        const pdfBuffer = await this.rebuildPDFWithTextAndImages(
            originalBuffer,
            textElements,
            [],
            imageElements,
            documentNumber
        );

        // Upload to a dedicated generated-documents path (no temp template needed)
        const safeDocNum = documentNumber.replace('#', '');
        const s3Key = `generated-documents/${organizationId}/${safeDocNum}-${Date.now()}.pdf`;
        await s3Service.uploadFile(s3Key, pdfBuffer, 'application/pdf');

        const downloadUrl = await s3Service.generatePresignedDownloadUrl(s3Key, 7200);

        return { s3Key, downloadUrl };
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
            const fontCache: FontCache = new Map();

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
                    await this.addTextElement(newPdfDoc, newPage, element, fontCache);
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
            const fontCache: FontCache = new Map();

            // Embed font for document number (uses cache)
            const helveticaFont = await this.getCachedFont(newPdfDoc, fontCache, 'helvetica', false, false);

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
                    await this.addTextElement(newPdfDoc, newPage, element, fontCache);
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
        } catch (error) {
            console.error('Error adding image element:', error);
        }
    }


    /**
     * Get or create a cached font for a PDF document.
     */
    private async getCachedFont(pdfDoc: PDFDocument, fontCache: FontCache, fontFamily: string, isBold: boolean, isItalic: boolean): Promise<PDFFont> {
        const key = `${fontFamily}-${isBold ? 'b' : ''}-${isItalic ? 'i' : ''}`;
        let font = fontCache.get(key);
        if (font) return font;

        if (fontFamily.includes('times')) {
            if (isBold && isItalic) font = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
            else if (isBold) font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
            else if (isItalic) font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
            else font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        } else if (fontFamily.includes('courier')) {
            if (isBold && isItalic) font = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);
            else if (isBold) font = await pdfDoc.embedFont(StandardFonts.CourierBold);
            else if (isItalic) font = await pdfDoc.embedFont(StandardFonts.CourierOblique);
            else font = await pdfDoc.embedFont(StandardFonts.Courier);
        } else {
            if (isBold && isItalic) font = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
            else if (isBold) font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            else if (isItalic) font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
            else font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        }

        fontCache.set(key, font);
        return font;
    }

    private async addTextElement(pdfDoc: PDFDocument, page: PDFPage, element: any, fontCache?: FontCache): Promise<void> {
        try {
            const fontFamily = element.fontFamily?.toLowerCase() || 'arial';
            const isBold = element.isBold === true;
            const isItalic = element.isItalic === true;
            const cache = fontCache ?? new Map<string, PDFFont>();
            const font = await this.getCachedFont(pdfDoc, cache, fontFamily, isBold, isItalic);
            
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
    }

    /**
     * Add signature to PDF page
     */
    private async addSignatureToPage(
        pdfDoc: PDFDocument,
        page: PDFPage,
        edit: any
    ): Promise<void> {
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
    }
}

export const pdfEditorService = new PDFEditorService();
