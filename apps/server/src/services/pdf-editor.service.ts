import { PrismaClient } from '@prisma/client';
import { s3Service } from '../services/s3.service.js';
import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from 'pdf-lib';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { fileCleanupQueue } from '../queues/file-cleanup.queue.js';
import { NLPService, EntityType } from './nlp.service.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const prisma = new PrismaClient();

export class PDFEditorService {

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
            
            // Create new PDF with only graphics (no text)
            const newPdfDoc = await PDFDocument.create();
            
            console.log('📄 Converting pages to images (removing text layer)...');
            
            for (let i = 0; i < originalPages.length; i++) {
                const originalPage = originalPages[i];
                if (!originalPage) continue;
                
                const { width, height } = originalPage.getSize();
                
                // Create new blank page
                const newPage = newPdfDoc.addPage([width, height]);
                
                // Draw white background
                newPage.drawRectangle({
                    x: 0,
                    y: 0,
                    width,
                    height,
                    color: rgb(1, 1, 1),
                });
                
                console.log(`✅ Page ${i + 1} prepared (blank for text overlay)`);
            }
            
            // Save the new PDF
            const pdfBytes = await newPdfDoc.save();
            const pdfBuffer = Buffer.from(pdfBytes);
            
            // Upload to S3 with temporary key
            const timestamp = Date.now();
            const s3Key = `templates/${organizationId}/editable-${timestamp}.pdf`;
            
            await s3Service.uploadFile(s3Key, pdfBuffer, 'application/pdf');
            
            // Generate presigned URL (2 hour expiry)
            const editablePdfUrl = await s3Service.generatePresignedDownloadUrl(s3Key, 7200);
            
            console.log('✅ Editable PDF created without text layer');
            
            return {
                editablePdfUrl,
                s3Key,
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
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const pages = pdfDoc.getPages();

            // Extract text with pdf-parse (using createRequire for CommonJS module)
            const parse = require('pdf-parse');
            const parsedPdf = await parse(pdfBuffer);

            // Apply NLP to extract entities and placeholders
            console.log('🧠 Applying NLP to extract entities and placeholders...');
            const nlpResult = await NLPService.extractEntities(parsedPdf.text);

            const pdfData = {
                templateId,
                type: 'text',
                totalPages: pages.length,
                pages: pages.map((page, index) => ({
                    pageNumber: index + 1,
                    width: page.getWidth(),
                    height: page.getHeight(),
                })),
                extractedText: parsedPdf.text,
                editable: true,
                ocrApplied: false,
                nlpEntities: nlpResult.entities,
                explicitPlaceholders: nlpResult.placeholders,
                placeholderSuggestions: nlpResult.suggestions,
            };

            console.log(`✅ Processed ${pages.length} pages with ${nlpResult.entities.length} entities`);
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
            // Load PDF
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const pages = pdfDoc.getPages();

            // Try to extract existing text first (using createRequire for CommonJS module)
            const parse = require('pdf-parse');
            const parsedPdf = await parse(pdfBuffer);

            let ocrText = parsedPdf.text;
            let ocrApplied = false;

            // If minimal text, apply OCR
            if (parsedPdf.text.trim().length < 100) {
                console.log('🔍 Minimal text detected, applying OCR...');
                ocrText = await this.performOCR(pdfBuffer);
                ocrApplied = true;
            }

            // Apply NLP to extract entities and placeholders
            console.log('🧠 Applying NLP to extract entities and placeholders...');
            const nlpResult = await NLPService.extractEntities(ocrText);

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
                nlpEntities: nlpResult.entities,
                explicitPlaceholders: nlpResult.placeholders,
                placeholderSuggestions: nlpResult.suggestions,
            };

            console.log(`✅ Processed scanned PDF with ${ocrApplied ? 'OCR' : 'existing text'} and ${nlpResult.entities.length} entities`);
            return pdfData;
        } catch (error) {
            console.error('❌ Error processing scanned PDF:', error);
            throw error;
        }
    }

    /**
     * Perform OCR using Tesseract
     */
    private async performOCR(buffer: Buffer): Promise<string> {
        console.log('🔤 Running OCR with Tesseract...');

        const worker = await createWorker('eng');

        try {
            // Preprocess with Sharp for better OCR accuracy
            const preprocessedBuffer = await sharp(buffer)
                .greyscale()
                .normalize()
                .sharpen()
                .toBuffer();

            const {
                data: { text },
            } = await worker.recognize(preprocessedBuffer);

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
     * Save edited PDF
     * Creates new version and schedules for deletion
     */
    async saveEditedPDF(
        templateId: string,
        editedContent: any,
        organizationId: string
    ): Promise<any> {
        try {
            console.log('💾 Saving edited PDF:', templateId);

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
        organizationId: string
    ): Promise<any> {
        try {
            console.log('💾 Saving editable PDF (Sejda-style):', templateId);
            console.log(`📝 Text elements: ${textElements.length}, Deleted: ${deletedElements.length}`);

            // Get original template
            const originalTemplate = await prisma.template.findUnique({
                where: { id: templateId },
            });

            if (!originalTemplate || !originalTemplate.s3_key) {
                throw new Error('Original template not found');
            }

            // Download original PDF
            const originalBuffer = await s3Service.downloadFileAsBuffer(originalTemplate.s3_key);

            // Generate new PDF with modified text
            const editedPdfBuffer = await this.rebuildPDFWithText(
                originalBuffer,
                textElements,
                deletedElements
            );

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
        console.log('🔨 Creating NEW PDF from extracted data (Sejda-style)...');
        console.log(`📝 Total text elements: ${textElements.length}`);
        console.log(`🗑️ Deleted elements: ${deletedElements.length}`);

        try {
            
            const originalDoc = await PDFDocument.load(originalBuffer);
            const originalPages = originalDoc.getPages();
            const newPdfDoc = await PDFDocument.create();

            console.log('📄 Creating new PDF with extracted data...');

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
                    // Skip deleted elements
                    const isDeleted = deletedElements.some(
                        del => del.id === element.id && del.page === pageNum
                    );
                    return !isDeleted;
                });

                console.log(`📄 Page ${pageNum}: ${activeElements.length}/${pageElements.length} active elements`);

                // Redraw ALL active text elements (both original and new)
                for (const element of activeElements) {
                    await this.addTextElement(newPdfDoc, newPage, element);
                }
            }

            // Save the COMPLETELY NEW PDF
            const pdfBytes = await newPdfDoc.save();
            console.log('✅ NEW PDF created successfully from extracted data');
            console.log(`📦 PDF size: ${(pdfBytes.length / 1024).toFixed(2)} KB`);
            
            return Buffer.from(pdfBytes);
        } catch (error) {
            console.error('❌ Error creating new PDF from extracted data:', error);
            throw error;
        }
    }


    private async addTextElement(pdfDoc: PDFDocument, page: PDFPage, element: any): Promise<void> {
        try {
            console.log(`📝 Adding text: "${element.text}" with font: ${element.fontFamily}, bold: ${element.isBold}, italic: ${element.isItalic}`);
            
            // Enhanced font selection based on formatting
            let font: any;
            const fontFamily = element.fontFamily?.toLowerCase() || 'arial';
            const isBold = element.isBold === true;
            const isItalic = element.isItalic === true;

            // Map font families to StandardFonts with bold/italic support
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
            
            // Frontend extracts at scale 2, so we need to divide by 2
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

            console.log(`✅ Text added successfully at (${adjustedX.toFixed(2)}, ${y.toFixed(2)})`);
        } catch (error) {
            console.error('❌ Error adding text to new PDF:', error);
            // Continue with other elements even if one fails
        }
    }

    /**
     * Generate PDF from edits using pdf-lib
     */
    private async generatePDFFromEdits(
        originalBuffer: Buffer,
        editedContent: any
    ): Promise<Buffer> {
        console.log('🎨 Generating edited PDF with pdf-lib...');

        try {
            // Load original PDF
            const pdfDoc = await PDFDocument.load(originalBuffer);
            const pages = pdfDoc.getPages();

            // Apply edits if provided
            if (editedContent?.edits && Array.isArray(editedContent.edits)) {
                for (const edit of editedContent.edits) {
                    await this.applyEdit(pdfDoc, pages, edit);
                }
            }

            // Save the PDF
            const pdfBytes = await pdfDoc.save();
            return Buffer.from(pdfBytes);
        } catch (error) {
            console.error('❌ Error generating PDF:', error);
            throw error;
        }
    }

    /**
     * Apply individual edit to PDF
     */
    private async applyEdit(pdfDoc: PDFDocument, pages: PDFPage[], edit: any): Promise<void> {
        const page = pages[edit.page - 1];
        if (!page) {
            console.warn(`⚠️ Page ${edit.page} not found, skipping edit`);
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
                console.warn(`⚠️ Unknown edit type: ${edit.type}`);
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
            y: page.getHeight() - edit.position.y, // PDF coordinates start from bottom
            size: fontSize,
            font,
            color: rgb(color.r, color.g, color.b),
        });
    }

    /**
     * Add image to PDF page
     */
    private async addImageToPage(pdfDoc: PDFDocument, page: PDFPage, edit: any): Promise<void> {
        console.log('📷 Adding image to page:', edit.position);
    }

    /**
     * Add signature to PDF page
     */
    private async addSignatureToPage(
        pdfDoc: PDFDocument,
        page: PDFPage,
        edit: any
    ): Promise<void> {
        // Parse base64 signature data and embed as image
        console.log('✍️ Adding signature to page:', edit.position);
    }

    /**
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
