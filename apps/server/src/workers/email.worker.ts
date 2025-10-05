import { Job, Worker } from "bullmq";
import { emailQueueName } from "../queues/email.queue.js";
import { redisConnection } from "../queues/index.js";
import { sendEmail } from "../config/mail.config.js";

interface emailDataType {
    to: string;
    subject: string;
    html: string;
}

export const emailQueueWorker = new Worker(
    emailQueueName,
    async (job: Job) => {
        const data: emailDataType = job.data;
        await sendEmail(data.to, data.subject, data.html);
        console.log("The queue data is", data);
    },
    {
        connection: redisConnection,
    }
)