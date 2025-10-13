import { createApp } from "./app.js";
import { emailQueueWorker } from "./workers/email.worker.js";

const PORT = process.env.PORT || 4000;


async function startServer() {
    try {
        const app = createApp();
        
        console.log('🔄 Starting email queue worker...');
        emailQueueWorker.on('completed', (job) => {
            console.log(`✅ Email job ${job.id} completed successfully`);
        });
        
        emailQueueWorker.on('failed', (job, err) => {
            console.error(`❌ Email job ${job?.id} failed:`, err.message);
        });
        
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
            console.log(`📧 Email worker is listening for jobs...`);
        });
    } catch (error) {
        console.error("Error starting server:", error);
    }
}

startServer();