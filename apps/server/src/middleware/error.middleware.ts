import { Prisma } from '@prisma/client';
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

type StatusError = Error & {
    status?: number;
    statusCode?: number;
};

const getStatusCode = (error: StatusError): number => {
    if (typeof error.status === 'number') return error.status;
    if (typeof error.statusCode === 'number') return error.statusCode;
    return 500;
};

export const globalErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (res.headersSent) {
        return;
    }

    if (error instanceof ZodError) {
        res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            })),
        });
        return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            res.status(409).json({
                success: false,
                message: 'A record with these values already exists',
            });
            return;
        }

        if (error.code === 'P2025') {
            res.status(404).json({
                success: false,
                message: 'Resource not found',
            });
            return;
        }
    }

    const statusCode = getStatusCode(error as StatusError);
    const safeMessage = statusCode >= 500 ? 'Internal server error' : (error as Error).message;

    res.status(statusCode).json({
        success: false,
        message: safeMessage,
    });
};
