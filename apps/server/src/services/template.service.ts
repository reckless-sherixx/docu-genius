import prisma from "../lib/prisma.js";
import { S3Service } from "../lib/aws/s3.js";

export class TemplateService {

    static async uploadTemplate(
        userId: string,
        organizationId: string,
        file: {
            buffer: Buffer;
            originalname: string;
            mimetype: string;
            size: number;
        },
        templateData: {
            name: string;
            description?: string;
            category?: string;
        }
    ) {
        try {
            const fileKey = S3Service.generateFileKey(
                userId,
                organizationId,
                file.originalname,
                'templates'
            );

            const uploadResult = await S3Service.uploadFile(
                file.buffer,
                fileKey,
                file.mimetype,
                {
                    userId,
                    organizationId,
                    originalName: file.originalname,
                }
            );

            // Save template metadata to database
            const template = await prisma.template.create({
                data: {
                    template_name: templateData.name,
                    template_description: templateData.description,
                    s3_key: fileKey,
                    s3_url: uploadResult.url,
                    file_size: BigInt(file.size),
                    mime_type: file.mimetype,
                    category: templateData.category || 'General',
                    uploaded_by: userId,
                    organization_id: organizationId,
                },
            });

            return {
                id: template.id,
                name: template.template_name,
                description: template.template_description,
                url: uploadResult.url,
                size: file.size,
                category: template.category,
                uploaded_at: template.created_at,
            };
        } catch (error) {
            console.error('❌ Failed to upload template:', error);
            throw error;
        }
    }

    static async getTemplates(organizationId: string) {
        try {
            const templates = await prisma.template.findMany({
                where: {
                    organization_id: organizationId,
                    is_temporary: false, 
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

            return templates.map((template) => ({
                id: template.id,
                name: template.template_name,
                description: template.template_description,
                url: template.s3_url,
                size: template.file_size ? Number(template.file_size) : 0,
                category: template.category,
                uploadedAt: template.created_at,
                mimeType: template.mime_type,
            }));
        } catch (error) {
            console.error('❌ Failed to get templates:', error);
            throw error;
        }
    }


    static async getTemplateDownloadUrl(templateId: string, userId: string) {
        try {
            const template = await prisma.template.findFirst({
                where: {
                    id: templateId,
                },
            });

            if (!template) {
                throw new Error('Template not found');
            }

            if (!template.s3_key) {
                throw new Error('Template file not found in storage');
            }

            // Generate presigned URL (expires in 1 hour)
            const downloadUrl = await S3Service.getPresignedDownloadUrl(
                template.s3_key,
                3600
            );

            return {
                url: downloadUrl,
                name: template.template_name,
                expires_in: 3600,
            };
        } catch (error) {
            console.error('❌ Failed to get download URL:', error);
            throw error;
        }
    }

    static async deleteTemplate(templateId: string, userId: string) {
        try {
            // Get template from database
            const template = await prisma.template.findFirst({
                where: {
                    id: templateId,
                },
            });

            if (!template) {
                throw new Error('Template not found');
            }

            // Check if user has permission 
            if (template.uploaded_by !== userId) {
                throw new Error('Permission denied');
            }

            // Delete from S3 if s3_key exists
            if (template.s3_key) {
                await S3Service.deleteFile(template.s3_key);
            }

            // Delete from database
            await prisma.template.delete({
                where: { id: templateId },
            });

            return { success: true };
        } catch (error) {
            console.error('❌ Failed to delete template:', error);
            throw error;
        }
    }

    static async getUploadUrl(
        userId: string,
        organizationId: string,
        fileName: string,
        contentType: string
    ) {
        try {
            // Generate unique key
            const fileKey = S3Service.generateFileKey(
                userId,
                organizationId,
                fileName,
                'templates'
            );

            // Generate presigned URL (expires in 15 minutes)
            const uploadUrl = await S3Service.getPresignedUploadUrl(
                fileKey,
                contentType,
                900
            );

            return {
                uploadUrl,
                fileKey,
                expires_in: 900,
            };
        } catch (error) {
            console.error('❌ Failed to get upload URL:', error);
            throw error;
        }
    }

    static async confirmUpload(
        userId: string,
        organizationId: string,
        fileKey: string,
        templateData: {
            name: string;
            description?: string;
            category?: string;
            size: number;
            mimeType: string;
        }
    ) {
        try {
            // Verify file exists in S3
            const exists = await S3Service.fileExists(fileKey);
            if (!exists) {
                throw new Error('File not found in storage');
            }

            // Create template record
            const template = await prisma.template.create({
                data: {
                    template_name: templateData.name,
                    template_description: templateData.description,
                    s3_key: fileKey,
                    s3_url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
                    file_size: BigInt(templateData.size),
                    mime_type: templateData.mimeType,
                    category: templateData.category || 'General',
                    uploaded_by: userId,
                    organization_id: organizationId,
                },
            });

            return {
                id: template.id,
                name: template.template_name,
                description: template.template_description,
                url: template.s3_url,
                category: template.category,
                uploaded_at: template.created_at,
            };
        } catch (error) {
            console.error('❌ Failed to confirm upload:', error);
            throw error;
        }
    }
}
