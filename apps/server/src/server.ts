import { createServer } from "http";
import { createApp } from "./app.js";
import { emailQueueWorker } from "./workers/email.worker.js";
import { templateProcessingWorker } from "./workers/template-processing.worker.js";
import { initializeSocketIO } from "./config/websocket.config.js";
import { tesseractPool } from "./lib/tesseract-pool.js";

const PORT = process.env.PORT || 4000;


async function startServer() {
    try {
        const app = createApp();
        const httpServer = createServer(app);
    
        initializeSocketIO(httpServer);

        emailQueueWorker.on('completed', (job) => {
        });
        
        emailQueueWorker.on('failed', (job, err) => {
            console.error(`Email job ${job?.id} failed:`, err.message);
        });

        templateProcessingWorker.on('ready', () => {
        });
        
        httpServer.listen(PORT, () => {
        });

        tesseractPool.warmup(2).then(() => {
        }).catch(err => {
            console.warn(' Tesseract warmup failed (will initialize lazily):', err.message);
        });
    } catch (error) {
        console.error("Error starting server:", error);
    }
}

startServer();