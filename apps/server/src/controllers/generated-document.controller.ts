import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

export class GeneratedDocumentController {
  /**
   * Get all generated documents for an organization
   */
  async getGeneratedDocuments(req: Request, res: Response): Promise<any> {
    try {
      const { organizationId } = req.params;
      const userId = (req as any).userId;

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
      console.error('❌ Error fetching generated documents:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch generated documents',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a generated document
   */
  async deleteGeneratedDocument(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;

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

      // Check if user is the creator of the document or an admin of the organization
      const membership = document.organization?.members[0];
      const isCreator = document.generated_by === userId;
      const isAdmin = membership?.role === 'ADMIN';

      if (!isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this document',
        });
      }

      // Delete the document
      await prisma.generatedDocument.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      console.error('❌ Error deleting generated document:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete document',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const generatedDocumentController = new GeneratedDocumentController();
