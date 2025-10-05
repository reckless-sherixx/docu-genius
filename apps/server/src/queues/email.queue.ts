import { Queue } from "bullmq";
import { defaultQueueOptions, redisConnection } from "./index.js";

export const emailQueueName = "emailQueue";

export const emailQueue = new Queue(emailQueueName, {
    connection: redisConnection,
    defaultJobOptions: defaultQueueOptions
});