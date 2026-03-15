import { Worker, Job } from 'bullmq';
import prisma from '../lib/prisma.js';
import { s3Service } from '../services/s3.service.js';
import { redisConnection } from '../config/redis.config.js';

interface CleanupJob {
  templateId: string;
  reason: 'expired' | 'manual';
}

/**
 * File Cleanup Worker
 * Deletes expired temporary files from S3 and database
 */
class FileCleanupWorker {
  async cleanupExpiredFile(job: Job<CleanupJob>): Promise<void> {
    const { templateId, reason } = job.data;

    try {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return;
      }

      // Delete PDF from S3
      if (template.s3_key) {
        await s3Service.deleteFile(template.s3_key);
      }

      // Delete companion JSON elements file if present
      if (template.extracted_text?.endsWith('-elements.json')) {
        await s3Service.deleteFile(template.extracted_text).catch(() => {});
      }

      // Delete from database
      await prisma.template.delete({
        where: { id: templateId },
      });
    } catch (error) {
      console.error(`❌ Error cleaning up template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Scan and cleanup expired files
   */
  async scanExpiredFiles(): Promise<void> {
    try {
      const now = new Date();

      // Find temporary templates that have expired
      const expiredTemplates = await prisma.template.findMany({
        where: {
          is_temporary: true,
          expires_at: {
            lt: now,
          },
        },
      });

      for (const template of expiredTemplates) {
        try {
          // Delete PDF from S3
          if (template.s3_key) {
            await s3Service.deleteFile(template.s3_key);
          }

          // Delete companion JSON elements file if present
          if (template.extracted_text?.endsWith('-elements.json')) {
            await s3Service.deleteFile(template.extracted_text).catch(() => {});
          }

          // Delete from database
          await prisma.template.delete({
            where: { id: template.id },
          });
        } catch (error) {
          console.error(`❌ Error cleaning up ${template.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error scanning expired files:', error);
    }
  }
}

// Create worker instance
const fileCleanupWorker = new FileCleanupWorker();

// Worker for individual cleanup jobs
export const cleanupWorker = new Worker(
  'file-cleanup',
  async (job: Job<CleanupJob>) => {
    await fileCleanupWorker.cleanupExpiredFile(job);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

cleanupWorker.on('completed', (job) => {
});

cleanupWorker.on('failed', (job, err) => {
  console.error(`❌ Cleanup job failed: ${job?.id}`, err);
});

// Scheduled scanner 
setInterval(
  async () => {
    await fileCleanupWorker.scanExpiredFiles();
  },
  60 * 60 * 1000 
);
