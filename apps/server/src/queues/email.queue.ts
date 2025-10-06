import { Queue } from "bullmq";
import { defaultQueueOptions, redisConnection } from "./index.js";

export const emailQueueName = "emailQueue";

export const emailQueue = new Queue(emailQueueName, {
    connection: redisConnection,
    defaultJobOptions: defaultQueueOptions
});

// Log queue connection status
emailQueue.on('error', (error) => {
    console.error('❌ Redis Queue Error:', error.message);
    console.log('⚠️  Make sure Redis is running on:', redisConnection);
});

console.log('✅ Email queue initialized');