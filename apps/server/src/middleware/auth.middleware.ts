import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

// Extend Express Request type to include user and userId
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            user?: {
                id: string;
                email: string;
                name: string;
            };
        }
    }
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
            });
        }

        const token = authHeader.substring(7); 

        // Verify token
        const decoded = AuthService.verifyToken(token);

        // Get user details
        const user = await AuthService.getUserById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        req.userId = decoded.userId;
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
};
