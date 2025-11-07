import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { s3Service } from '../services/s3.service.js';
import { redisConnection } from '../config/redis.config.js';

const prisma = new PrismaClient();

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

    console.log(`🗑️ Cleaning up template: ${templateId} (reason: ${reason})`);

    try {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        console.log(`⚠️ Template not found: ${templateId}`);
        return;
      }

      // Delete from S3
      if (template.s3_key) {
        await s3Service.deleteFile(template.s3_key);
        console.log(`✅ Deleted from S3: ${template.s3_key}`);
      }

      // Delete from database
      await prisma.template.delete({
        where: { id: templateId },
      });

      console.log(`✅ Template deleted from database: ${templateId}`);
    } catch (error) {
      console.error(`❌ Error cleaning up template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Scan and cleanup expired files
   * Run periodically to find and delete expired files
   */
  async scanExpiredFiles(): Promise<void> {
    try {
      console.log('🔍 Scanning for expired temporary files...');

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      // Find templates that were created > 2 hours ago and are temporary
      // Assuming temporary files have "Edited - " in their name
      const expiredTemplates = await prisma.template.findMany({
        where: {
          template_name: {
            contains: 'Edited - ',
          },
          created_at: {
            lt: twoHoursAgo,
          },
        },
      });

      console.log(`📊 Found ${expiredTemplates.length} expired files`);

      for (const template of expiredTemplates) {
        try {
          // Delete from S3
          if (template.s3_key) {
            await s3Service.deleteFile(template.s3_key);
          }

          // Delete from database
          await prisma.template.delete({
            where: { id: template.id },
          });

          console.log(`✅ Cleaned up expired template: ${template.id}`);
        } catch (error) {
          console.error(`❌ Error cleaning up ${template.id}:`, error);
        }
      }

      console.log('✅ Expired files cleanup completed');
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
  console.log(`✅ Cleanup job completed: ${job.id}`);
});

cleanupWorker.on('failed', (job, err) => {
  console.error(`❌ Cleanup job failed: ${job?.id}`, err);
});

// Scheduled scanner (runs every hour)
setInterval(
  async () => {
    await fileCleanupWorker.scanExpiredFiles();
  },
  60 * 60 * 1000 // 1 hour
);

console.log('🧹 File cleanup worker started');
console.log('⏰ Scheduled scanner will run every hour');
