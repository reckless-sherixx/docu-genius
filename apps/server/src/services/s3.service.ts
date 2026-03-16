import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, awsConfig } from '../config/aws.config.js';
import crypto from 'crypto';

export class S3Service {
  private s3Client = getS3Client();
  private bucketName = awsConfig.bucketName;

  async generatePresignedUploadUrlForKey(
    key: string,
    fileType: string,
    expiresIn: number = 900
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: fileType,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating pre-signed URL for key:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  async generatePresignedUploadUrl(
    fileName: string,
    fileType: string,
    organizationId: string
  ): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    try {
      // Generate unique key for S3
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
      const key = `templates/${organizationId}/${uniqueFileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: fileType,
        Metadata: {
          originalName: fileName,
          organizationId: organizationId,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Generate pre-signed URL
      const expiresIn = 900; 
      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        uploadUrl,
        key,
        expiresIn,
      };
    } catch (error) {
      console.error('Error generating pre-signed URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Generate pre-signed URL for downloading/viewing file from S3
   */
  async generatePresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      return downloadUrl;
    } catch (error) {
      console.error(' Error generating pre-signed download URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file');
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(key: string): Promise<any> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  /**
   * Download file from S3 as buffer 
   */
  async downloadFileAsBuffer(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const stream = response.Body as any;
      
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      return buffer;
    } catch (error) {
      console.error('Error downloading file from S3:', error);
      throw new Error('Failed to download file');
    }
  }

  /**
   * Upload file buffer directly to S3
   */
  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file');
    }
  }
}

export const s3Service = new S3Service();
