import { Queue } from 'bullmq';
import { redisConnection, defaultQueueOptions } from './index.js';

export const templateQueue = new Queue('template-processing', {
  connection: redisConnection,
  defaultJobOptions: defaultQueueOptions,
});

console.log('✅ Template processing queue initialized');
