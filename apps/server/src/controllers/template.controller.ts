import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { s3Service } from '../services/s3.service.js';
import { templateQueue } from '../queues/template.queue.js';

export class TemplateController {

    async directUpload(req: Request, res: Response): Promise<any> {
        try {
            const userId = (req as any).userId;
            const file = req.file;
            const { organizationId, name, description, category } = req.body;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                });
            }

            if (!organizationId || !name) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: organizationId, name',
                });
            }

            console.log('📤 Direct upload received:', {
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                organizationId,
            });

            // Upload to S3
            const s3Key = `templates/${organizationId}/${Date.now()}-${file.originalname}`;
            await s3Service.uploadFile(s3Key, file.buffer, file.mimetype);

            console.log('✅ File uploaded to S3:', s3Key);

            // Create template record
            const template = await prisma.template.create({
                data: {
                    template_name: file.originalname,
                    template_description: description || null,
                    category: category || 'GENERAL',
                    s3_key: s3Key,
                    file_size: BigInt(file.size),
                    mime_type: file.mimetype,
                    status: 'PROCESSING',
                    uploaded_by: userId,
                    organization_id: organizationId,
                    is_temporary: true,
                },
            });

            // Generate S3 URL
            const s3Url = await s3Service.generatePresignedDownloadUrl(s3Key, 86400);
            await prisma.template.update({
                where: { id: template.id },
                data: { s3_url: s3Url },
            });

            // Enqueue processing job
            console.log('📤 Enqueueing template for processing...');
            await templateQueue.add('process-template', {
                templateId: template.id,
                s3Key: s3Key,
                fileName: file.originalname,
                mimeType: file.mimetype,
            });

            console.log('✅ Template created and queued:', template.id);

            return res.status(201).json({
                success: true,
                message: 'File uploaded successfully',
                data: {
                    id: template.id,
                    templateId: template.id,
                    name: template.template_name,
                    status: 'PROCESSING',
                },
            });
        } catch (error) {
            console.error('❌ Error in direct upload:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload file',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Step 1: Generate pre-signed URL for upload
     */
    async generateUploadUrl(req: Request, res: Response): Promise<any> {
        try {
            const userId = (req as any).userId;
            const { fileName, fileType, fileSize, organizationId, name, description, category } = req.body;

            // Validate required fields
            if (!fileName || !fileType || !organizationId || !name) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: fileName, fileType, organizationId, name',
                });
            }

            const MAX_FILE_SIZE = 10 * 1024 * 1024;
            if (fileSize && fileSize > MAX_FILE_SIZE) {
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds maximum limit of 50MB',
                });
            }

            // Validate file type
            const ALLOWED_TYPES = [
                'application/pdf',
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'image/webp',
            ];

            if (!ALLOWED_TYPES.includes(fileType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid file type. Only PDF and images are allowed',
                });
            }

            console.log('🔐 Generating pre-signed URL for upload:', {
                fileName,
                fileType,
                organizationId,
                userId,
            });

            // Generate pre-signed URL
            const { uploadUrl, key, expiresIn } = await s3Service.generatePresignedUploadUrl(
                fileName,
                fileType,
                organizationId
            );

        
            const template = await prisma.template.create({
                data: {
                    template_name: name,
                    template_description: description || null,
                    category: category || 'GENERAL',
                    s3_key: key,
                    file_size: fileSize ? BigInt(fileSize) : null,
                    mime_type: fileType,
                    status: 'UPLOADING',
                    uploaded_by: userId,
                    organization_id: organizationId,
                    is_temporary: true, 
                },
            });

            console.log('✅ Template created with UPLOADING status:', template.id);

            return res.status(200).json({
                success: true,
                message: 'Pre-signed URL generated successfully',
                data: {
                    uploadUrl,
                    templateId: template.id,
                    expiresIn,
                },
            });
        } catch (error) {
            console.error('❌ Error generating upload URL:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate upload URL',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Step 2: Confirm upload and start processing
     */
    async confirmUpload(req: Request, res: Response): Promise<any> {
        try {
            const { templateId } = req.body;

            if (!templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'templateId is required',
                });
            }

            console.log('✅ Confirming upload for template:', templateId);

            // Get template from database
            const template = await prisma.template.findUnique({
                where: { id: templateId },
            });

            if (!template) {
                return res.status(404).json({
                    success: false,
                    message: 'Template not found',
                });
            }

            if (!template.s3_key) {
                return res.status(400).json({
                    success: false,
                    message: 'Template S3 key is missing',
                });
            }

            // Generate permanent S3 URL
            const s3Url = await s3Service.generatePresignedDownloadUrl(template.s3_key, 86400); // 24 hours

            // Update template with S3 URL
            await prisma.template.update({
                where: { id: templateId },
                data: {
                    s3_url: s3Url,
                },
            });

            // Enqueue processing job
            console.log('📤 Enqueueing template for processing...');
            await templateQueue.add('process-template', {
                templateId: template.id,
                s3Key: template.s3_key,
                fileName: template.template_name,
                mimeType: template.mime_type || 'application/pdf',
            });

            console.log('✅ Template enqueued for processing:', templateId);

            return res.status(200).json({
                success: true,
                message: 'Upload confirmed. Template is being processed.',
                data: {
                    templateId: template.id,
                    status: 'PROCESSING',
                },
            });
        } catch (error) {
            console.error('❌ Error confirming upload:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to confirm upload',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async getTemplate(req: Request, res: Response): Promise<any> {
        try {
            const { id } = req.params;

            const template = await prisma.template.findUnique({
                where: { id },
                include: {
                    fields: true,
                },
            });

            if (!template) {
                return res.status(404).json({
                    success: false,
                    message: 'Template not found',
                });
            }

            // Convert BigInt to string for JSON serialization
            const serializedTemplate = {
                ...template,
                file_size: template.file_size ? template.file_size.toString() : null,
            };

            return res.status(200).json({
                success: true,
                data: serializedTemplate,
            });
        } catch (error) {
            console.error('❌ Error fetching template:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch template',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }


    async getTemplates(req: Request, res: Response): Promise<any> {
        try {
            const { organizationId } = req.query;

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'organizationId is required',
                });
            }

            // Only return permanent (saved) templates, not temporary ones
            const templates = await prisma.template.findMany({
                where: {
                    organization_id: organizationId as string,
                    is_temporary: false, 
                },
                include: {
                    fields: true,
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

            // Convert BigInt to string
            const serializedTemplates = templates.map((template: any) => ({
                ...template,
                file_size: template.file_size ? template.file_size.toString() : null,
            }));

            return res.status(200).json({
                success: true,
                data: serializedTemplates,
            });
        } catch (error) {
            console.error('❌ Error fetching templates:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch templates',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async deleteTemplate(req: Request, res: Response): Promise<any> {
        try {
            const { id } = req.params;

            const template = await prisma.template.findUnique({
                where: { id },
            });

            if (!template) {
                return res.status(404).json({
                    success: false,
                    message: 'Template not found',
                });
            }

            // Delete from S3
            if (template.s3_key) {
                await s3Service.deleteFile(template.s3_key);
            }

            // Delete from database (cascade will delete fields)
            await prisma.template.delete({
                where: { id },
            });

            console.log('✅ Template deleted:', id);

            return res.status(200).json({
                success: true,
                message: 'Template deleted successfully',
            });
        } catch (error) {
            console.error('❌ Error deleting template:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete template',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    async approveTemplate(req: Request, res: Response): Promise<any> {
        try {
            const { id } = req.params;
            const userId = (req as any).userId;

            const template = await prisma.template.update({
                where: { id },
                data: {
                    is_approved: true,
                    approved_by: userId,
                    approved_at: new Date(),
                },
            });

            console.log('✅ Template approved:', id);

            return res.status(200).json({
                success: true,
                message: 'Template approved successfully',
                data: template,
            });
        } catch (error) {
            console.error('❌ Error approving template:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to approve template',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}

export const templateController = new TemplateController();
