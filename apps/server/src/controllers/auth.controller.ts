import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { loginSchema, registerSchema, forgetPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema.js';
import { ZodError } from 'zod';

export class AuthController {

    // Register a new user
    static async register(req: Request, res: Response) {
        try {
            // Validate request body
            const validatedData = registerSchema.parse(req.body);

            // Register user
            const result = await AuthService.register(validatedData);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: result,
            });
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }

            if (error instanceof Error) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
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

    static async login(req: Request, res: Response) {
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
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }

            if (error instanceof Error) {
                return res.status(401).json({
                    success: false,
                    message: error.message,
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    // Login Check Route
    static async loginCheck(req: Request, res: Response) {
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
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }

            if (error instanceof Error) {
                return res.status(401).json({
                    success: false,
                    message: error.message,
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    // Forget Password
    static async forgetPassword(req: Request, res: Response) {
        try {
            const validatedData = forgetPasswordSchema.parse(req.body);

            await AuthService.forgetPassword(validatedData);

            return res.status(200).json({
                success: true,
                message: 'A password reset link has been sent to your email.',
            });

        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                return res.status(422).json({ 
                    success: false,
                    message: "Validation error", 
                    errors 
                });
            }

            if (error instanceof Error) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    // Reset Password
    static async resetPassword(req: Request, res: Response) {
        try {
            const validatedData = resetPasswordSchema.parse(req.body);

            await AuthService.resetPassword(validatedData);

            res.redirect(`${process.env.FRONTEND_URL}/login`);
            return res.status(200).json({
                success: true,
                message: 'Password reset successful',
            });

        } catch (error) {
            if (error instanceof ZodError) {
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                return res.status(422).json({ 
                    success: false,
                    message: "Validation error", 
                    errors 
                });
            }

            if (error instanceof Error) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }


    // Secure Route 
    static async secureRoute(req: Request, res: Response) {
        console.log('Accessing secure route for user:', req.userId);
        return res.status(200).json({
            success: true,
            message: 'You have accessed a secure route',
            userId: req.userId,
        })
    }

    // Logout 
    static async logout(req: Request, res: Response) {
        res.status(200).json({
            success: true,
            message: 'Logout successful',
        });
    }
}
