import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

// Extend Express Request type to include userId
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = AuthService.verifyToken(token);

        // Attach userId to request
        req.userId = decoded.userId;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
};
