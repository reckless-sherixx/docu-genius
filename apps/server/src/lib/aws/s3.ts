import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import awsConfig, { getS3Client } from '../../config/aws.config.js';

const getClient = () => {
    try {
        return getS3Client();
    } catch (error) {
        console.error('S3 Client not configured:', error);
        throw error;
    }
};

const BUCKET_NAME = awsConfig.bucketName;

export class S3Service {
    static async uploadFile(
        file: Buffer,
        key: string,
        contentType: string,
        metadata?: Record<string, string>
    ) {
        try {
            const s3Client = getClient();
            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                Body: file,
                ContentType: contentType,
                Metadata: metadata,
            });

            await s3Client.send(command);

            return {
                key,
                url: `https://${BUCKET_NAME}.s3.${awsConfig.region}.amazonaws.com/${key}`,
            };
        } catch (error) {
            console.error('S3 Upload Error:', error);
            throw new Error('Failed to upload file to S3');
        }
    }


    static async getFile(key: string) {
        try {
            const s3Client = getClient();
            const command = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });

            const response = await s3Client.send(command);
            return response.Body;
        } catch (error) {
            console.error('S3 Get File Error:', error);
            throw new Error('Failed to retrieve file from S3');
        }
    }

    static async getPresignedUploadUrl(
        key: string,
        contentType: string,
        expiresIn: number = 3600
    ) {
        try {
            const s3Client = getClient();
            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                ContentType: contentType,
            });

            const url = await getSignedUrl(s3Client, command, { expiresIn });
            return url;
        } catch (error) {
            console.error('S3 Presigned URL Error:', error);
            throw new Error('Failed to generate presigned URL');
        }
    }

    static async getPresignedDownloadUrl(key: string, expiresIn: number = 3600) {
        try {
            const s3Client = getClient();
            const command = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });

            const url = await getSignedUrl(s3Client, command, { expiresIn });
            return url;
        } catch (error) {
            console.error('S3 Download URL Error:', error);
            throw new Error('Failed to generate download URL');
        }
    }


    static async deleteFile(key: string) {
        try {
            const s3Client = getClient();
            const command = new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });

            await s3Client.send(command);
            return { success: true };
        } catch (error) {
            console.error('S3 Delete Error:', error);
            throw new Error('Failed to delete file from S3');
        }
    }

    static async fileExists(key: string): Promise<boolean> {
        try {
            const s3Client = getClient();
            const command = new HeadObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });

            await s3Client.send(command);
            return true;
        } catch (error) {
            return false;
        }
    }


    static generateFileKey(
        userId: string,
        organizationId: string,
        fileName: string,
        type: 'templates' | 'documents' | 'avatars' = 'templates'
    ): string {
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `${type}/${organizationId}/${userId}/${timestamp}-${sanitizedFileName}`;
    }
}

export default S3Service;
