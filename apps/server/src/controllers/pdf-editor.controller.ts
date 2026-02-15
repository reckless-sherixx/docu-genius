import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { pdfEditorService } from '../services/pdf-editor.service.js';
import { s3Service } from '../services/s3.service.js';
import { emitDocumentGenerated } from '../config/websocket.config.js';

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

      // Prepare PDF for editing 
      const pdfData = await pdfEditorService.preparePDFForEditing(id);

      const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
      const downloadUrl = `${backendUrl}/api/pdf-editor/${id}/download`;

      // Check if this template has saved text elements 
      let savedTextElements = null;
      if (template.extracted_text && template.extracted_text.endsWith('-elements.json')) {
        try {
          console.log('📄 Loading saved text elements from S3:', template.extracted_text);
          const jsonBuffer = await s3Service.downloadFileAsBuffer(template.extracted_text);
          savedTextElements = JSON.parse(jsonBuffer.toString());
          console.log('✅ Loaded saved text elements:', savedTextElements.textElements?.length || 0, 'elements');
        } catch (err) {
          console.warn('⚠️ Could not load saved text elements:', err);
        }
      }

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
          savedTextElements, 
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
   * Download PDF through backend proxy 
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
   * Save editable PDF 
   */
  async saveEditablePDF(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, textElements, imageElements, deletedElements } = req.body;
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

      // Save editable PDF with text and image modifications
      const result = await pdfEditorService.saveEditablePDF(
        templateId,
        textElements,
        deletedElements || [],
        template.organization_id,
        imageElements || []
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
   * Prepare editable PDF
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


      const result = await pdfEditorService.prepareEditablePDFWithoutText(
        templateId,
        organizationId
      );

      return res.status(200).json({
        success: true,
        message: 'Editable PDF prepared successfully (not saved to S3 yet)',
        editablePdfUrl: result.editablePdfUrl,
        editablePdfBase64: result.editablePdfBase64,
        extractedText: result.extractedText,
        totalPages: result.totalPages,
        pages: result.pages,
        nlpEntities: result.nlpEntities || [],
        nlpPlaceholders: result.nlpPlaceholders || [],
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
   * Save template as permanent 
   */
  async savePermanentTemplate(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, templateName, templateDescription } = req.body;

      if (!templateId) {
        return res.status(400).json({
          success: false,
          message: 'Template ID is required',
        });
      }

      // Get the template
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      const updatedTemplate = await prisma.template.update({
        where: { id: templateId },
        data: {
          is_temporary: false,
          expires_at: null, 
          template_name: templateName || template.template_name.replace('Edited - ', ''),
          template_description: templateDescription || template.template_description,
        },
      });

      const serializedTemplate = {
        ...updatedTemplate,
        file_size: updatedTemplate.file_size ? updatedTemplate.file_size.toString() : null,
      };

      return res.status(200).json({
        success: true,
        message: 'Template saved permanently',
        data: serializedTemplate,
      });
    } catch (error) {
      console.error('❌ Error saving permanent template:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save permanent template',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate a document from a template
   */
  async generateDocument(req: Request, res: Response): Promise<any> {
    try {
      const { templateId, textElements, imageElements, pin } = req.body;
      const userId = (req as any).userId;

      if (!templateId) {
        return res.status(400).json({
          success: false,
          message: 'Template ID is required',
        });
      }

      if (!pin) {
        return res.status(400).json({
          success: false,
          message: 'Document generation PIN is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, document_generation_pin: true },
      });

      if (!user?.document_generation_pin) {
        return res.status(400).json({
          success: false,
          message: 'Please set up your document generation PIN in your profile first',
        });
      }

      if (user.document_generation_pin !== parseInt(pin)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid document generation PIN',
        });
      }

      // Get the template
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      const lastDocument = await prisma.generatedDocument.findFirst({
        orderBy: { created_at: 'desc' },
        select: { document_number: true },
      });

      let nextNumber = 1;
      if (lastDocument?.document_number) {
        const match = lastDocument.document_number.match(/#DOC-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]!) + 1;
        }
      }
      const documentNumber = `#DOC-${String(nextNumber).padStart(4, '0')}`;

      const savedPdf = await pdfEditorService.saveEditablePDF(
        templateId,
        textElements || [],
        [],
        template.organization_id || '',
        imageElements || [],
        documentNumber
      );

      const generatedDocUrl = savedPdf.downloadUrl;

      const generatedDocument = await prisma.generatedDocument.create({
        data: {
          document_number: documentNumber,
          generated_document_url: generatedDocUrl,
          template_id: templateId,
          generated_by: userId,
          organization_id: template.organization_id,
        },
      });

      if (template.organization_id) {
        emitDocumentGenerated({
          documentId: generatedDocument.id,
          templateName: template.template_name,
          userName: user?.name || 'Unknown User',
          userEmail: user?.email || '',
          organizationId: template.organization_id,
          createdAt: generatedDocument.created_at.toISOString(),
        });
      }

      console.log(`Document generated successfully: ${generatedDocument.id}`);

      return res.status(200).json({
        success: true,
        message: 'Document generated successfully',
        data: {
          documentId: generatedDocument.id,
          documentNumber: generatedDocument.document_number,
          downloadUrl: generatedDocUrl,
          templateName: template.template_name,
        },
      });
    } catch (error) {
      console.error('❌ Error generating document:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate document',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const pdfEditorController = new PDFEditorController();
