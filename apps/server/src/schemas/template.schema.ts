import z from "zod";

// Validation schemas
export const uploadTemplateSchema = z.object({
    name: z.string().min(1, 'Template name is required'),
    description: z.string().optional(),
    category: z.string().optional(),
    organizationId: z.string().uuid('Invalid organization ID'),
});

export const getUploadUrlSchema = z.object({
    fileName: z.string().min(1, 'File name is required'),
    fileSize: z.number().max(5 * 1024 * 1024, 'File size must not exceed 5MB'),
    mimeType: z.string().refine(
        (type) => [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp'
        ].includes(type),
        'Only PDF and image files are allowed'
    ),
    organizationId: z.string().uuid('Invalid organization ID'),
});

export const confirmUploadSchema = z.object({
    fileKey: z.string().min(1, 'File key is required'),
    name: z.string().min(1, 'Template name is required'),
    description: z.string().optional(),
    category: z.string().optional(),
    size: z.number(),
    mimeType: z.string(),
    organizationId: z.string().uuid('Invalid organization ID'),
});
