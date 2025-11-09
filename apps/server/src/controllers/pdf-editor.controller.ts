import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { pdfEditorService } from '../services/pdf-editor.service.js';
import { s3Service } from '../services/s3.service.js';

export class PDFEditorController {
  async openForEditing(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Template ID is required',
        });
      }

      const template = await prisma.template.findUnique({
        where: { id },
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      // Prepare PDF for editing (applies OCR if scanned)
      const pdfData = await pdfEditorService.preparePDFForEditing(id);

      // Use backend proxy URL instead of direct S3 (avoids CORS issues)
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
      const downloadUrl = `${backendUrl}/api/pdf-editor/${id}/download`;

      // Serialize BigInt fields to strings for JSON
      const serializedTemplate = {
        ...template,
        file_size: template.file_size ? template.file_size.toString() : null,
      };

      return res.status(200).json({
        success: true,
        data: {
          template: serializedTemplate,
          pdfData,
          downloadUrl,
          editable: true,
        },
      });
    } catch (error) {
      console.error('❌ Error opening PDF for editing:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to open PDF for editing',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Download PDF through backend proxy (avoids CORS issues)
   */
  async downloadPDF(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Template ID is required',
        });
      }

      const template = await prisma.template.findUnique({
        where: { id },
      });

      if (!template || !template.s3_key) {
        return res.status(404).json({
          success: false,
          message: 'Template not found or no file associated',
        });
      }

      console.log(`📥 Proxying PDF download for template: ${id}`);

      // Download from S3
      const pdfBuffer = await s3Service.downloadFileAsBuffer(template.s3_key);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `inline; filename="${template.template_name}.pdf"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');

      // Send PDF buffer
      res.send(pdfBuffer);
      console.log(`✅ PDF sent successfully: ${pdfBuffer.length} bytes`);
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to download PDF',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Save edited PDF
   * Creates new temporary file that expires in 2 hours
   */
  async saveEditedPDF(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, editedContent } = req.body;
      const userId = (req as any).userId;

      if (!templateId || !editedContent) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: templateId, editedContent',
        });
      }

      // Get organization ID
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template || !template.organization_id) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      // Save edited PDF
      const result = await pdfEditorService.saveEditedPDF(
        templateId,
        editedContent,
        template.organization_id
      );

      return res.status(200).json({
        success: true,
        message: 'PDF saved successfully. File will be deleted after 2 hours.',
        data: result,
      });
    } catch (error) {
      console.error('❌ Error saving edited PDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save edited PDF',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Save editable PDF (Sejda-style with text manipulation)
   * Rebuilds entire PDF with modified text elements
   */
  async saveEditablePDF(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, textElements, deletedElements } = req.body;
      const userId = (req as any).userId;

      if (!templateId || !textElements) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: templateId, textElements',
        });
      }

      // Get organization ID
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template || !template.organization_id) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      // Save editable PDF with text modifications
      const result = await pdfEditorService.saveEditablePDF(
        templateId,
        textElements,
        deletedElements || [],
        template.organization_id
      );

      return res.status(200).json({
        success: true,
        message: 'PDF saved successfully. File will be deleted after 2 hours.',
        data: result,
      });
    } catch (error) {
      console.error('❌ Error saving editable PDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save editable PDF',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Prepare editable PDF: Create new PDF with blank pages (no text layer)
   */
  async prepareEditablePDF(req: Request, res: Response): Promise<any> {
    try {
      const { templateId } = req.body;
      const organizationId = (req as any).user.organizationId;

      if (!templateId) {
        return res.status(400).json({
          success: false,
          message: 'Template ID is required',
        });
      }

      console.log(`🔨 Preparing editable PDF for template: ${templateId}`);

      // Create a new PDF without text layer using the service
      const result = await pdfEditorService.prepareEditablePDFWithoutText(
        templateId,
        organizationId
      );

      return res.status(200).json({
        success: true,
        message: 'Editable PDF prepared successfully',
        editablePdfUrl: result.editablePdfUrl,
      });
    } catch (error) {
      console.error('❌ Error preparing editable PDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to prepare editable PDF',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Add text to PDF
   */
  async addText(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, text, position, style } = req.body;

      // TODO: Implement text addition using pdf-lib
      
      return res.status(200).json({
        success: true,
        message: 'Text added successfully',
      });
    } catch (error) {
      console.error('❌ Error adding text:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add text',
      });
    }
  }

  /**
   * Add image to PDF
   */
  async addImage(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, imageUrl, position, size } = req.body;

      // TODO: Implement image addition using pdf-lib

      return res.status(200).json({
        success: true,
        message: 'Image added successfully',
      });
    } catch (error) {
      console.error('❌ Error adding image:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add image',
      });
    }
  }

  /**
   * Add signature to PDF
   */
  async addSignature(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, signatureData, position } = req.body;

      // TODO: Implement signature addition

      return res.status(200).json({
        success: true,
        message: 'Signature added successfully',
      });
    } catch (error) {
      console.error('❌ Error adding signature:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add signature',
      });
    }
  }

  /**
   * Highlight text in PDF
   */
  async highlightText(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, coordinates, color } = req.body;

      // TODO: Implement text highlighting

      return res.status(200).json({
        success: true,
        message: 'Text highlighted successfully',
      });
    } catch (error) {
      console.error('❌ Error highlighting text:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to highlight text',
      });
    }
  }

  /**
   * Draw shape on PDF
   */
  async drawShape(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, shapeType, coordinates, style } = req.body;

      // TODO: Implement shape drawing

      return res.status(200).json({
        success: true,
        message: 'Shape drawn successfully',
      });
    } catch (error) {
      console.error('❌ Error drawing shape:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to draw shape',
      });
    }
  }
}

export const pdfEditorController = new PDFEditorController();
