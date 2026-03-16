import { NextFunction, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { s3Service } from '../services/s3.service.js';
import { emailQueue } from '../queues/email.queue.js';
import { renderEmailEjs } from '../lib/helper.js';

export class GeneratedDocumentController {
  private extractS3KeyFromUrl(documentUrl: string): string | null {
    try {
      const url = new URL(documentUrl);
      const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
      const path = decodeURIComponent(url.pathname.replace(/^\//, ''));

      if (!path) return null;

      if (bucketName && url.hostname.startsWith(bucketName)) {
        return path;
      }

      if (bucketName && path.startsWith(`${bucketName}/`)) {
        return path.slice(bucketName.length + 1);
      }

      return path;
    } catch {
      return null;
    }
  }

  /**
   * Get all generated documents for an organization
   */
  async getGeneratedDocuments(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { organizationId } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID is required',
        });
      }

      // Verify user is a member of the organization
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organization_id_user_id: {
            organization_id: organizationId,
            user_id: userId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this organization',
        });
      }

      const documents = await prisma.generatedDocument.findMany({
        where: {
          organization_id: organizationId,
        },
        include: {
          template: {
            select: {
              id: true,
              template_name: true,
              category: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a generated document
   */
  async deleteGeneratedDocument(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required',
        });
      }

      // Get the document
      const document = await prisma.generatedDocument.findUnique({
        where: { id },
        include: {
          organization: {
            include: {
              members: {
                where: { user_id: userId },
              },
            },
          },
        },
      });

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      const membership = document.organization?.members[0];
      const isCreator = document.generated_by === userId;
      const isAdmin = membership?.role === 'ADMIN';

      if (!isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this document',
        });
      }

      const s3Key = this.extractS3KeyFromUrl(document.generated_document_url);
      if (!s3Key) {
        return res.status(500).json({
          success: false,
          message: 'Failed to locate document file in storage',
        });
      }

      await s3Service.deleteFile(s3Key);

      // Delete the document
      await prisma.generatedDocument.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async emailDocument(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const { recipientEmail, emailSubject, emailBody: customBody } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required',
        });
      }

      if (!recipientEmail) {
        return res.status(400).json({
          success: false,
          message: 'Recipient email is required',
        });
      }

      if (!emailSubject || !customBody) {
        return res.status(400).json({
          success: false,
          message: 'Email subject and body are required',
        });
      }

      // Get the document with template, user and organization info
      const document = await prisma.generatedDocument.findUnique({
        where: { id },
        include: {
          template: {
            select: {
              template_name: true,
              category: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          organization: {
            select: {
              name: true,
              members: {
                where: { user_id: userId },
              },
            },
          },
        },
      });

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Only the document generator or an admin can send emails
      const membership = document.organization?.members[0];
      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to email this document',
        });
      }

      const isDocumentGenerator = document.generated_by === userId;
      const isAdmin = membership.role === 'ADMIN';

      if (!isDocumentGenerator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only the document generator or an organization admin can email documents',
        });
      }

      // Generate a fresh presigned download URL 
      let downloadUrl = document.generated_document_url;
      const s3Key = this.extractS3KeyFromUrl(document.generated_document_url);
      if (s3Key) {
        downloadUrl = await s3Service.generatePresignedDownloadUrl(s3Key, 86400);
      } else {
        console.warn('⚠️ Could not parse S3 key from document URL, using stored URL');
      }

      // Build the verification URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const cleanDocNumber = document.document_number!.replace('#', '');
      const verificationUrl = `${frontendUrl}/verification?id=${encodeURIComponent(cleanDocNumber)}`;

      // Render the email template with custom subject/body
      const emailHtml = await renderEmailEjs('document-email', {
        emailSubject,
        emailBody: customBody,
        documentNumber: document.document_number,
        downloadUrl,
        verificationUrl,
        organizationName: document.organization?.name || 'Unknown',
      });

      // Queue the email
      await emailQueue.add('emailQueueName', {
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml,
      });

      return res.status(200).json({
        success: true,
        message: `Document emailed successfully to ${recipientEmail}`,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const generatedDocumentController = new GeneratedDocumentController();
