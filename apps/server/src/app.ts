import express, { Express, Request, Response } from 'express';
import "dotenv/config";
import morgan from 'morgan';
import cors from 'cors';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from './config/mail.config.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const createApp = (): Express => {
    const app = express();

    app.use(morgan('dev'));
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    app.set("view engine" , "ejs");
    app.set("views" , path.resolve(__dirname, "./lib/views"));


    app.get("/" , async(req:Request, res:Response) => {
        const html = await ejs.renderFile(__dirname + `/lib/views/emails/welcome.ejs` , { name : "Vidyansh Singh"})
        await sendEmail("24155442@kiit.ac.in" , "Testing Email" , html);
        res.json({msg:"Email sent successfully"});
    });
    app.get("/health", (req:Request, res:Response) => res.json({ status: "ok" }));

    return app;
}
