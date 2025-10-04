import express, { Express, Request, Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';

export const createApp = (): Express => {
    const app = express();

    app.use(morgan('dev'));
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));


    app.get("/health", (req:Request, res:Response) => res.json({ status: "ok" }));

    return app;
}
