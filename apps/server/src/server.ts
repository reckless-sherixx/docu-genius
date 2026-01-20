import { createServer } from "http";
import { createApp } from "./app.js";
import { emailQueueWorker } from "./workers/email.worker.js";
import { templateProcessingWorker } from "./workers/template-processing.worker.js";
import { initializeSocketIO } from "./config/websocket.config.js";

const PORT = process.env.PORT || 4000;


async function startServer() {
    try {
        const app = createApp();
        const httpServer = createServer(app);
    
        initializeSocketIO(httpServer);
        
        console.log('🔄 Starting email queue worker...');
        emailQueueWorker.on('completed', (job) => {
            console.log(`✅ Email job ${job.id} completed successfully`);
        });
        
        emailQueueWorker.on('failed', (job, err) => {
            console.error(`❌ Email job ${job?.id} failed:`, err.message);
        });

        console.log('🔄 Starting template processing worker...');
        templateProcessingWorker.on('ready', () => {
            console.log(`📄 Template processing worker is ready`);
        });
        
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
            console.log(`📧 Email worker is listening for jobs...`);
            console.log(`📄 Template processing worker is listening for jobs...`);
            console.log(`🔌 WebSocket server is ready for connections...`);
        });
    } catch (error) {
        console.error("Error starting server:", error);
    }
}

startServer();