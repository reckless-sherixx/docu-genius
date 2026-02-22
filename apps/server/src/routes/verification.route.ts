import { Request, Response, Router } from 'express'
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma.js';

const router: Router = Router();

const verificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many verification attempts, please try again later.' },
});

router.get("/verification/:documentNumber", verificationLimiter, async (req: Request, res: Response): Promise<any> => {
    try {
        const { documentNumber } = req.params;

        if (!documentNumber) {
            return res.status(400).json({
                success: false,
                message: 'Document number is required',
            });
        }

        // Normalize: accept with or without the # prefix
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
        console.error('❌ Verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while verifying the document.',
        });
    }
});

export default router;