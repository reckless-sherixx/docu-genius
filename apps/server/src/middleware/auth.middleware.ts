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
        // Support both Authorization header and query parameter token
        // Query parameter is needed for PDF.js worker which doesn't pass headers properly
        let token: string | undefined;
        
        const authHeader = req.headers.authorization;
        const queryToken = req.query.token as string;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (queryToken) {
            token = queryToken;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
            });
        } 

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
