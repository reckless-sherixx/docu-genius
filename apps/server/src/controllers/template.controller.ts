import { Request, Response } from 'express';
import { TemplateService } from '../services/template.service.js';
import { ZodError } from 'zod';
import { z } from 'zod';
import { confirmUploadSchema, getUploadUrlSchema, uploadTemplateSchema } from '../schemas/template.schema.js';



export class TemplateController {
    // Direct upload using Multer
    static async uploadTemplate(req: Request, res: Response) {
        try {
            const userId = req.userId || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
            }

            // Check if file exists
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                });
            }

            console.log('📤 Upload request received:', {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                body: req.body
            });

            // Validate request body
            const validatedData = uploadTemplateSchema.parse(req.body);

            // Upload file to S3 and save metadata
            const template = await TemplateService.uploadTemplate(
                userId,
                validatedData.organizationId,
                {
                    buffer: req.file.buffer,
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                },
                {
                    name: validatedData.name,
                    description: validatedData.description,
                    category: validatedData.category,
                }
            );

            console.log('✅ Upload successful:', template);

            res.status(201).json({
                success: true,
                message: 'Template uploaded successfully',
                data: template,
            });
        } catch (error) {
            console.error('❌ Upload error:', error);
            
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }

            if (error instanceof Error) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    static async getUploadUrl(req: Request, res: Response) {
        try {
            const userId = req.userId || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
            }

            const validatedData = getUploadUrlSchema.parse(req.body);

            // Generate presigned URL
            const result = await TemplateService.getUploadUrl(
                userId,
                validatedData.organizationId,
                validatedData.fileName,
                validatedData.mimeType
            );

            res.status(200).json({
                success: true,
                message: 'Upload URL generated successfully',
                data: result,
            });
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }

            if (error instanceof Error) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }

            console.error('Error generating upload URL:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    static async confirmUpload(req: Request, res: Response) {
        try {
            const userId = req.userId || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
            }

            const validatedData = confirmUploadSchema.parse(req.body);

            // Confirm upload and create template record
            const template = await TemplateService.confirmUpload(
                userId,
                validatedData.organizationId,
                validatedData.fileKey,
                {
                    name: validatedData.name,
                    description: validatedData.description,
                    category: validatedData.category,
                    size: validatedData.size,
                    mimeType: validatedData.mimeType,
                }
            );

            res.status(201).json({
                success: true,
                message: 'Template uploaded successfully',
                data: template,
            });
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }

            if (error instanceof Error) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }

            console.error('Error confirming upload:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    static async getTemplates(req: Request, res: Response) {
        try {
            const userId = req.userId || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
            }

            const { organizationId } = req.params;

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization ID is required',
                });
            }

            const templates = await TemplateService.getTemplates(organizationId);

            res.status(200).json({
                success: true,
                data: templates,
            });
        } catch (error) {
            console.error('Error fetching templates:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    static async getDownloadUrl(req: Request, res: Response) {
        try {
            const userId = req.userId || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
            }

            const { templateId } = req.params;

            if (!templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'Template ID is required',
                });
            }

            const result = await TemplateService.getTemplateDownloadUrl(templateId, userId);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error instanceof Error) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }

            console.error('Error getting download URL:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    static async deleteTemplate(req: Request, res: Response) {
        try {
            const userId = req.userId || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
            }

            const { templateId } = req.params;

            if (!templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'Template ID is required',
                });
            }

            await TemplateService.deleteTemplate(templateId, userId);

            res.status(200).json({
                success: true,
                message: 'Template deleted successfully',
            });
        } catch (error) {
            if (error instanceof Error) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }

            console.error('Error deleting template:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }
}
