import 'express';

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            user?: {
                id: string;
                email: string;
                name: string;
                organizationId?: string;
            };
        }
    }
}

export {};
