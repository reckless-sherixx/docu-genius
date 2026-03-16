import { NextFunction, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { pdfEditorService } from '../services/pdf-editor.service.js';
import { s3Service } from '../services/s3.service.js';
import { emitDocumentGenerated } from '../config/websocket.config.js';

export class PDFEditorController {
  async openForEditing(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User ID required',
        });
      }

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

      // Verify organization exists
      if (!template.organization_id) {
        return res.status(400).json({
          success: false,
          message: 'Template missing organization information',
        });
      }

      // Verify user has access to this organization
      const userOrg = await prisma.organizationMember.findUnique({
        where: {
          organization_id_user_id: {
            organization_id: template.organization_id,
            user_id: userId,
          },
        },
      });

      if (!userOrg) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to access this template',
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
          const jsonBuffer = await s3Service.downloadFileAsBuffer(template.extracted_text);
          savedTextElements = JSON.parse(jsonBuffer.toString());
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
      console.error('❌ Error opening PDF for editing:', error instanceof Error ? error.message : error);
      next(error);
    }
  }

  /**
   * Download PDF through backend proxy 
   */
  async downloadPDF(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      // Validate input
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User ID required',
        });
      }

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Template ID is required',
        });
      }

      // Get template with organization info
      const template = await prisma.template.findUnique({
        where: { id },
      });

      if (!template || !template.s3_key) {
        return res.status(404).json({
          success: false,
          message: 'Template not found or no file associated',
        });
      }

      // Verify organization exists
      if (!template.organization_id) {
        return res.status(400).json({
          success: false,
          message: 'Template missing organization information',
        });
      }

      // Verify user has access to this organization
      const userOrg = await prisma.organizationMember.findUnique({
        where: {
          organization_id_user_id: {
            organization_id: template.organization_id,
            user_id: userId,
          },
        },
      });

      if (!userOrg) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to access this template',
        });
      }

      // Check if file exists in S3
      const fileExists = await s3Service.fileExists(template.s3_key);
      if (!fileExists) {
        return res.status(404).json({
          success: false,
          message: 'PDF file not found in storage',
        });
      }

      // Download from S3
      const pdfBuffer = await s3Service.downloadFileAsBuffer(template.s3_key);

      // Safely encode filename for Content-Disposition header
      const sanitizedFilename = (template.template_name || 'document')
        .replace(/[^\w\s.-]/g, '')
        .substring(0, 100) + '.pdf';

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      console.error('❌ Error downloading PDF:', error instanceof Error ? error.message : error);
      next(error);
    }
  }

  /**
   * Save edited PDF
   */
  async saveEditedPDF(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { templateId, editedContent } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

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
      next(error);
    }
  }

  /**
   * Save editable PDF 
   */
  async saveEditablePDF(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { templateId, textElements, imageElements, deletedElements } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

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
      next(error);
    }
  }

  /**
   * Prepare editable PDF
   */
  async prepareEditablePDF(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { templateId } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User ID required',
        });
      }

      if (!templateId) {
        return res.status(400).json({
          success: false,
          message: 'Template ID is required',
        });
      }

      const template = await prisma.template.findUnique({
        where: { id: templateId },
        select: { organization_id: true },
      });

      if (!template?.organization_id) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      // Verify user has access to this organization
      const userOrg = await prisma.organizationMember.findUnique({
        where: {
          organization_id_user_id: {
            organization_id: template.organization_id,
            user_id: userId,
          },
        },
      });

      if (!userOrg) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to access this template',
        });
      }

      const result = await pdfEditorService.prepareEditablePDFWithoutText(
        templateId,
        template.organization_id
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
      console.error('❌ Error preparing editable PDF:', error instanceof Error ? error.message : error);
      next(error);
    }
  }

  /**
   * Save template as permanent 
   */
  async savePermanentTemplate(req: Request, res: Response, next: NextFunction): Promise<any> {
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
      next(error);
    }
  }

  /**
   * Generate a document from a template
   */
  async generateDocument(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { templateId, textElements, imageElements, pin } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

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

      // Fetch template and last document number in parallel
      const [template, lastDocument] = await Promise.all([
        prisma.template.findUnique({
          where: { id: templateId },
        }),
        prisma.generatedDocument.findFirst({
          orderBy: { created_at: 'desc' },
          select: { document_number: true },
        }),
      ]);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found',
        });
      }

      let nextNumber = 1;
      if (lastDocument?.document_number) {
        const match = lastDocument.document_number.match(/#DOC-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]!) + 1;
        }
      }
      const documentNumber = `#DOC-${String(nextNumber).padStart(4, '0')}`;

      const generatedPdf = await pdfEditorService.generateDocumentPDF(
        templateId,
        textElements || [],
        template.organization_id || '',
        imageElements || [],
        documentNumber
      );

      const generatedDocUrl = generatedPdf.downloadUrl;

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
      next(error);
    }
  }
}

export const pdfEditorController = new PDFEditorController();
