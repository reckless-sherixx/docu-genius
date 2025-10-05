import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema } from '../schemas/auth.schema.js';
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

    // Login user
    // static async login(req: Request, res: Response) {
    //     try {
    //         // Validate request body
    //         const validatedData = loginSchema.parse(req.body);

    //         // Login user
    //         const result = await AuthService.login(validatedData);

    //         res.status(200).json({
    //             success: true,
    //             message: 'Login successful',
    //             data: result,
    //         });
    //     } catch (error) {
    //         if (error instanceof ZodError) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: 'Validation error',
    //                 errors: error.errors.map(err => ({
    //                     field: err.path.join('.'),
    //                     message: err.message,
    //                 })),
    //             });
    //         }

    //         if (error instanceof Error) {
    //             return res.status(401).json({
    //                 success: false,
    //                 message: error.message,
    //             });
    //         }

    //         res.status(500).json({
    //             success: false,
    //             message: 'Internal server error',
    //         });
    //     }
    // }

    // Logout (client-side should remove token)
    static async logout(req: Request, res: Response) {
        res.status(200).json({
            success: true,
            message: 'Logout successful',
        });
    }
}
