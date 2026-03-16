import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { loginSchema, registerSchema, forgetPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema.js';

export class AuthController {

    // Register a new user
    static async register(req: Request, res: Response, next: NextFunction) {
        try {
            const validatedData = registerSchema.parse(req.body);

            // Register user
            const result = await AuthService.register(validatedData);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    static async verifyEmail(req: Request, res: Response) {
        try {
            const { token } = req.query;

            if (!token) {
                return res.redirect(`${process.env.FRONTEND_URL}/verify-error`);
            }

            // Verify email
            await AuthService.verifyEmail(token as string);

            return res.redirect(`${process.env.FRONTEND_URL}/login`);

        } catch (error) {
            console.error('Email verification error:', error);
            return res.redirect(`${process.env.FRONTEND_URL}/verify-error`);
        }
    }

    static async verificationError(req: Request, res: Response) {
        const resendUrl = `${process.env.FRONTEND_URL}/resend-verification`;
        return res.render("emails/email-verification-error", { resendUrl });
    }

    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            // Validate request body
            const validatedData = loginSchema.parse(req.body);

            // Login user
            const result = await AuthService.login(validatedData);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    // Login Check Route
    static async loginCheck(req: Request, res: Response, next: NextFunction) {
        try {
            // Validate request body
            const validatedData = loginSchema.parse(req.body);

            // Login user
            await AuthService.loginCheck(validatedData);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: null,
            });
        } catch (error) {
            next(error);
        }
    }

    // Forget Password
    static async forgetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const validatedData = forgetPasswordSchema.parse(req.body);

            await AuthService.forgetPassword(validatedData);

            return res.status(200).json({
                success: true,
                message: 'A password reset link has been sent to your email.',
            });

        } catch (error) {
            next(error);
        }
    }

    // Reset Password
    static async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const validatedData = resetPasswordSchema.parse(req.body);

            await AuthService.resetPassword(validatedData);

            return res.redirect(`${process.env.FRONTEND_URL}/login`);

        } catch (error) {
            next(error);
        }
    }


    // Secure Route 
    static async secureRoute(req: Request, res: Response) {
        return res.status(200).json({
            success: true,
            message: 'You have accessed a secure route',
            userId: req.userId,
        })
    }

    // Get user profile
    static async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
            }

            const profile = await AuthService.getUserProfile(userId);

            return res.status(200).json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    }

    // Update user profile
    static async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
            }

            const { name } = req.body;
            const profile = await AuthService.updateProfile(userId, { name });

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    }

    // Set document generation PIN
    static async setPin(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
            }

            const { pin } = req.body;
            if (!pin || typeof pin !== 'number') {
                return res.status(400).json({
                    success: false,
                    message: 'PIN is required and must be a number',
                });
            }

            const result = await AuthService.setDocumentPin(userId, pin);

            return res.status(200).json({
                success: true,
                message: result.message,
                data: { hasPin: result.hasPin },
            });
        } catch (error) {
            next(error);
        }
    }

    // Verify document generation PIN
    static async verifyPin(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized',
                });
            }

            const { pin } = req.body;
            if (!pin || typeof pin !== 'number') {
                return res.status(400).json({
                    success: false,
                    message: 'PIN is required and must be a number',
                });
            }

            const isValid = await AuthService.verifyDocumentPin(userId, pin);

            return res.status(200).json({
                success: true,
                data: { valid: isValid },
            });
        } catch (error) {
            next(error);
        }
    }

    // Logout 
    static async logout(req: Request, res: Response) {
        res.status(200).json({
            success: true,
            message: 'Logout successful',
        });
    }
}
