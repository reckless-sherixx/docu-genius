import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

export const renderEmailEjs = async (fileName: string, payload: any): Promise<string> => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const html: string = await ejs.renderFile(path.join(__dirname, 'views', 'emails', `${fileName}.ejs`), payload);
    return html;
}