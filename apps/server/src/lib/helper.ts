import ejs from 'ejs';
import moment from 'moment';
import path from 'path';
import { fileURLToPath } from 'url';

export const renderEmailEjs = async (fileName: string, payload: any): Promise<string> => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const html: string = await ejs.renderFile(path.join(__dirname, 'views', 'emails', `${fileName}.ejs`), payload);
    return html;
}

export const checkHourDiff = (date: Date | string): number => {
    const now = moment();
    const tokenSendAt = moment(date);
    const diffInHours = moment.duration(now.diff(tokenSendAt));
    return diffInHours.asHours();
}

export const generateToken = (length: number = 32): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
}