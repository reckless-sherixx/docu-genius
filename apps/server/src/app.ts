import express, { Express, Request, Response } from 'express';
import "dotenv/config";
import morgan from 'morgan';
import cors from 'cors';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import { emailQueue, emailQueueName } from './queues/email.queue.js';
import authRoutes from './routes/auth.route.js';
import organizationRoutes from './routes/organization.route.js';
import templateRoutes from './routes/template.route.js';
import pdfEditorRoutes from './routes/pdf-editor.route.js';
import generatedDocumentRoutes from './routes/generated-document.route.js';
import { appLimiter } from './config/rateLimit.config.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const createApp = (): Express => {
    const app = express();

    app.use(morgan('dev'));
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    app.use(appLimiter);

    app.set("view engine", "ejs");
    app.set("views", path.resolve(__dirname, "./lib/views"));

    // Routes
    app.use("/api/auth", authRoutes);
    app.use("/api/v1/organization", organizationRoutes);
    app.use("/api/templates", templateRoutes);
    app.use("/api/pdf-editor", pdfEditorRoutes);
    app.use("/api/generated-documents", generatedDocumentRoutes);

    app.get("/health", (req: Request, res: Response) => res.json({ status: "ok" }));

    return app;
}
