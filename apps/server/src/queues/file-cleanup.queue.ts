import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.config.js';
import { defaultQueueOptions } from './index.js';

export const fileCleanupQueueName = 'file-cleanup';

export const fileCleanupQueue = new Queue(fileCleanupQueueName, {
  connection: redisConnection,
  defaultJobOptions: defaultQueueOptions,
});

console.log('📋 File cleanup queue initialized');
