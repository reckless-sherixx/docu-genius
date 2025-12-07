import prisma from '../lib/prisma.js';
import { s3Service } from '../services/s3.service.js';
import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from 'pdf-lib';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { fileCleanupQueue } from '../queues/file-cleanup.queue.js';
import { createRequire } from 'module';
import { pdf } from 'pdf-to-img';

const require = createRequire(import.meta.url);

export class PDFEditorService {

    /**
     * Convert PDF pages to image buffers using pdf-to-img
     * This is a pure JavaScript solution that works in any environment (no native binaries)
     */
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
            
            // Extract text from original PDF first
            let extractedText = '';
            let ocrTextLines: Array<{text: string, pageIndex: number, x: number, y: number, width: number, height: number, fontSize: number}> = [];
            let imageScales: Array<{width: number, height: number}> = [];
            
            try {
                const parse = require('pdf-parse');
                const parsedPdf = await parse(originalBuffer);
                extractedText = parsedPdf.text || '';
                console.log(`📝 Extracted ${extractedText.length} characters from PDF via pdf-parse`);
            } catch (parseError) {
                console.warn('⚠️ pdf-parse failed:', parseError instanceof Error ? parseError.message : 'Unknown error');
            }

            // If scanned PDF with minimal text, try OCR
            if (isScannedPDF) {
                console.log('🔍 Scanned PDF detected, attempting OCR...');
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
                    
                    console.log('🔤 Running OCR on images...');
                    const ocrResult = await this.performOCROnPDFWithPositions(originalBuffer, originalPages.length);
                    extractedText = ocrResult.fullText;
                    ocrTextLines = ocrResult.lines;
                    console.log(`✅ OCR extracted ${ocrTextLines.length} text lines`);
                } catch (ocrError) {
                    console.error('❌ OCR failed:', ocrError instanceof Error ? ocrError.message : 'Unknown error');
                    console.error(ocrError);
                }
            }
            
            // Create new PDF
            const newPdfDoc = await PDFDocument.create();
            const pageData = [];
            
            // Always create BLANK pages - text will be rendered by frontend as editable elements
            // The extracted text (from pdf-parse or OCR) is sent separately to frontend
            console.log('📄 Creating blank PDF pages (text will be rendered by frontend)...');
            console.log(`🔢 isScannedPDF: ${isScannedPDF}, ocrTextLines.length: ${ocrTextLines.length}`);
            
            // Embed font for text (used only if we need to draw OCR text for scanned PDFs)
            const font = await newPdfDoc.embedFont(StandardFonts.Helvetica);
            
            for (let i = 0; i < originalPages.length; i++) {
                const originalPage = originalPages[i];
                if (!originalPage) continue;
                
                const { width: pdfWidth, height: pdfHeight } = originalPage.getSize();
                
                // Create blank page with same dimensions
                const newPage = newPdfDoc.addPage([pdfWidth, pdfHeight]);
                
                // For scanned PDFs with OCR text, embed text at original positions
                // (since pdf-parse won't extract text and frontend can't extract from scanned images)
                console.log(`📄 Page ${i + 1}: checking if scanned PDF (${isScannedPDF}) && ocrTextLines (${ocrTextLines.length})`);
                if (isScannedPDF && ocrTextLines.length > 0) {
                    // Get image dimensions for this page (for scaling OCR coordinates)
                    const imgScale = imageScales[i] || { width: pdfWidth * 2, height: pdfHeight * 2 };
                    const scaleX = pdfWidth / imgScale.width;
                    const scaleY = pdfHeight / imgScale.height;
                    
                    // Page margins to prevent text from touching edges
                    const PAGE_MARGIN = 20;
                    const maxTextWidth = pdfWidth - PAGE_MARGIN;
                    
                    // Get OCR lines for this page
                    const pageLines = ocrTextLines.filter(line => line.pageIndex === i);
                    
                    // Draw OCR text at their original positions
                    for (const lineData of pageLines) {
                        const text = lineData.text.trim();
                        if (!text) continue;
                        
                        // Scale OCR coordinates to PDF coordinates
                        let x = Math.max(PAGE_MARGIN / 2, lineData.x * scaleX);
                        // PDF coordinates are from bottom-left, OCR from top-left
                        const y = pdfHeight - (lineData.y * scaleY) - (lineData.fontSize * scaleY);
                        let fontSize = Math.max(6, Math.min(18, lineData.fontSize * scaleY));
                        
                        // Skip if position is outside page bounds
                        if (y < 0 || y > pdfHeight) continue;
                        
                        // Calculate available width from x position to right margin
                        const availableWidth = maxTextWidth - x;
                        
                        // Calculate text width and adjust if needed
                        let textWidth = font.widthOfTextAtSize(text, fontSize);
                        
                        // If text would overflow, reduce font size to fit
                        if (textWidth > availableWidth && availableWidth > 50) {
                            // Calculate the scale factor needed to fit
                            const scaleFactor = availableWidth / textWidth;
                            fontSize = Math.max(5, fontSize * scaleFactor * 0.95); // 0.95 for safety margin
                            textWidth = font.widthOfTextAtSize(text, fontSize);
                        }
                        
                        // If still too wide after font reduction, wrap the text
                        if (textWidth > availableWidth) {
                            // Split text into words and draw in multiple lines
                            const words = text.split(' ');
                            let currentLine = '';
                            let currentY = y;
                            const lineHeight = fontSize * 1.2;
                            
                            for (const word of words) {
                                const testLine = currentLine ? `${currentLine} ${word}` : word;
                                const testWidth = font.widthOfTextAtSize(testLine, fontSize);
                                
                                if (testWidth <= availableWidth) {
                                    currentLine = testLine;
                                } else {
                                    // Draw current line and start new one
                                    if (currentLine) {
                                        try {
                                            newPage.drawText(currentLine, {
                                                x: x,
                                                y: currentY,
                                                size: fontSize,
                                                font,
                                                color: rgb(0, 0, 0),
                                            });
                                        } catch (e) { /* skip */ }
                                        currentY -= lineHeight;
                                    }
                                    currentLine = word;
                                }
                            }
                            // Draw remaining text
                            if (currentLine && currentY > 0) {
                                try {
                                    newPage.drawText(currentLine, {
                                        x: x,
                                        y: currentY,
                                        size: fontSize,
                                        font,
                                        color: rgb(0, 0, 0),
                                    });
                                } catch (e) { /* skip */ }
                            }
                        } else {
                            // Text fits, draw normally
                            try {
                                newPage.drawText(text, {
                                    x: x,
                                    y: y,
                                    size: fontSize,
                                    font,
                                    color: rgb(0, 0, 0),
                                });
                            } catch (drawError) {
                                // Skip problematic characters
                                console.warn(`⚠️ Could not draw text: "${text.substring(0, 20)}..."`);
                            }
                        }
                    }
                    
                    console.log(`✅ Page ${i + 1} created with ${pageLines.length} OCR text elements (${pdfWidth.toFixed(0)}x${pdfHeight.toFixed(0)})`);
                } else {
                    // For regular text PDFs, just create blank page
                    // Text will be extracted by frontend using pdfjs and rendered as editable elements
                    console.log(`✅ Page ${i + 1} created as blank (${pdfWidth.toFixed(0)}x${pdfHeight.toFixed(0)})`);
                }
                
                pageData.push({
                    pageNumber: i + 1,
                    width: pdfWidth,
                    height: pdfHeight,
                });
            }
            
            // Save the new PDF to buffer (NOT to S3 yet - only when user explicitly saves)
            const pdfBytes = await newPdfDoc.save();
            const pdfBuffer = Buffer.from(pdfBytes);
            
            // Return as base64 for frontend to render - no S3 upload until user saves
            const pdfBase64 = pdfBuffer.toString('base64');
            const editablePdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
            
            console.log('✅ Editable PDF created in memory (not saved to S3 yet)');
            
            return {
                editablePdfUrl: editablePdfDataUrl,
                editablePdfBase64: pdfBase64,
                extractedText,
                totalPages: originalPages.length,
                pages: pageData,
                // No s3Key returned - PDF is not saved yet
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
                // Continue without extracted text - the frontend will handle text extraction
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
     * Uses pdf-to-img (pure JS, works in any environment - no native binaries)
     */
    private async performOCROnPDF(buffer: Buffer, pageCount: number): Promise<string> {
        console.log(`🔤 Running OCR on PDF pages...`);
        
        try {
            // Convert all PDF pages to images
            console.log(`📄 Converting PDF pages to images...`);
            const images = await this.convertPDFToImages(buffer, 2);
            const numPages = images.length;
            
            console.log(`✅ Converted ${numPages} pages to images`);
            
            // Run OCR on each page
            const worker = await createWorker('eng');
            let fullText = '';
            
            try {
                for (let i = 0; i < numPages; i++) {
                    const imageBuffer = images[i];
                    if (!imageBuffer) continue;
                    
                    // Preprocess image with Sharp for better OCR results
                    const preprocessedBuffer = await sharp(imageBuffer)
                        .greyscale()
                        .normalize()
                        .sharpen()
                        .toBuffer();
                    
                    console.log(`🔍 Running OCR on page ${i + 1}/${numPages}...`);
                    const { data: { text } } = await worker.recognize(preprocessedBuffer);
                    
                    fullText += text + '\n\n--- Page Break ---\n\n';
                }
            } finally {
                await worker.terminate();
            }
            
            console.log(`✅ OCR completed, extracted ${fullText.length} characters from ${numPages} pages`);
            
            return fullText.trim();
        } catch (error) {
            console.error('❌ PDF OCR failed:', error);
            throw new Error('OCR processing failed');
        }
    }

    /**
     * Perform OCR on a PDF and return text with page indices and positions
     * Uses pdf-to-img (pure JS, works in any environment - no native binaries)
     */
    private async performOCROnPDFWithPositions(buffer: Buffer, pageCount: number): Promise<{
        fullText: string;
        lines: Array<{text: string, pageIndex: number, x: number, y: number, width: number, height: number, fontSize: number}>;
    }> {
        console.log(`🔤 Running OCR with positions on PDF pages...`);
        
        try {
            // Convert all PDF pages to images
            console.log(`📄 Converting PDF pages to images for OCR...`);
            const images = await this.convertPDFToImages(buffer, 2);
            const numPages = images.length;
            
            console.log(`✅ Converted ${numPages} pages to images`);
            
            const worker = await createWorker('eng');
            let fullText = '';
            const allLines: Array<{text: string, pageIndex: number, x: number, y: number, width: number, height: number, fontSize: number}> = [];
            
            try {
                for (let i = 0; i < numPages; i++) {
                    const imageBuffer = images[i];
                    if (!imageBuffer) continue;
                    
                    // Get image dimensions for scaling
                    const imageMetadata = await sharp(imageBuffer).metadata();
                    const imageWidth = imageMetadata.width || 1;
                    const imageHeight = imageMetadata.height || 1;
                    
                    const preprocessedBuffer = await sharp(imageBuffer)
                        .greyscale()
                        .normalize()
                        .sharpen()
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
            
            return { fullText: fullText.trim(), lines: allLines };
        } catch (error) {
            console.error('❌ PDF OCR with positions failed:', error);
            throw new Error('OCR processing failed');
        }
    }

    /**
     * Perform OCR on an image buffer using Tesseract
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
            const textElementsS3Key = `templates/${organizationId}/edited-${timestamp}-elements.json`;

            // Upload PDF buffer to S3
            await s3Service.uploadFile(s3Key, editedPdfBuffer, 'application/pdf');

            // Also save text elements JSON to S3 
            const textElementsJson = JSON.stringify({
                textElements,
                deletedElements,
                savedAt: new Date().toISOString(),
            });
            await s3Service.uploadFile(textElementsS3Key, Buffer.from(textElementsJson), 'application/json');
            console.log('💾 Saved text elements JSON to S3:', textElementsS3Key);

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

                // Embed the original page (includes images, graphics, AND original text)
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

                console.log(`📄 Page ${pageNum}: ${activeElements.length}/${pageElements.length} active elements`);

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

                // Also cover deleted elements (they shouldn't show original text)
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
        console.log('✍️ Adding signature to page:', edit.position);
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
