import { NextFunction, Request, Response } from 'express';
import prisma from '../lib/prisma.js';

export class VerificationController {
  async verifyDocument(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { documentNumber } = req.params;

      if (!documentNumber) {
        return res.status(400).json({
          success: false,
          message: 'Document number is required',
        });
      }

      const normalizedNumber = documentNumber.startsWith('#')
        ? documentNumber
        : `#${documentNumber}`;

      const document = await prisma.generatedDocument.findUnique({
        where: { document_number: normalizedNumber },
        select: {
          id: true,
          document_number: true,
          created_at: true,
          template: {
            select: {
              template_name: true,
              category: true,
            },
          },
          user: {
            select: {
              name: true,
            },
          },
          organization: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found. Please check the document number and try again.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Document verified successfully',
        data: {
          documentNumber: document.document_number,
          templateName: document.template?.template_name || 'Untitled',
          category: document.template?.category || 'GENERAL',
          createdBy: document.user?.name || 'Unknown',
          organization: document.organization?.name || 'Unknown',
          createdAt: document.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const verificationController = new VerificationController();
