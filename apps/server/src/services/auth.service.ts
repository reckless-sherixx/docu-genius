import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { RegisterInput, LoginInput, ForgetPasswordInput, ResetPasswordInput } from '../schemas/auth.schema.js';
import { checkHourDiff, renderEmailEjs } from '../lib/helper.js';
import { emailQueue } from '../queues/email.queue.js';

export class AuthService {

    // Register a new user
    static async register(data: RegisterInput) {
        try {
            console.log('📝 Starting registration for:', data.email);

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: data.email }
            });

            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(data.password, 10);

            // Generate email verification token
            const verificationToken = jwt.sign(
                { email: data.email },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );


            // Create user
            const user = await prisma.user.create({
                data: {
                    name: data.name,
                    email: data.email,
                    password: hashedPassword,
                    email_verify_token: verificationToken,
                    token_send_at: new Date(),
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    email_verified_at: true,
                    created_at: true,
                }
            });


            // Generate verification URL
            const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${verificationToken}`;


            // Render email template
            const emailBody = await renderEmailEjs("verify-email", {
                name: data.name,
                verificationUrl: verificationUrl
            });


            // Send verification email
            await emailQueue.add('emailQueueName', {
                to: data.email,
                subject: "Verify your email - DocGenius",
                html: emailBody
            });

            // Generate JWT token for authentication
            const authToken = this.generateToken(user.id.toString());


            return {
                user,
                token: authToken,
                message: 'Registration successful. Please check your email to verify your account.'
            };
        } catch (error) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    }

    // Login user
    static async login(data: LoginInput) {
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(data.password, user.password);

        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Check if email is verified
        if (!user.email_verified_at) {
            throw new Error('Please verify your email before logging in');
        }

        // Generate JWT token
        const token = this.generateToken(user.id.toString());

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                email_verified_at: user.email_verified_at,
            },
            token: token,
        };
    }

    // Login Check Route
    static async loginCheck(data: LoginInput) {
        const user = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(data.password, user.password);

        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Check if email is verified
        if (!user.email_verified_at) {
            throw new Error('Please verify your email before logging in');
        }

        return {};
    }

    // Generate JWT token
    private static generateToken(userId: string): string {
        const secret = process.env.JWT_SECRET || 'your-secret-key';

        return jwt.sign({ userId }, secret, { expiresIn: '7d' });
    }

    // Verify JWT token
    static verifyToken(token: string): { userId: string } {
        const secret = process.env.JWT_SECRET || 'your-secret-key';

        try {
            const decoded = jwt.verify(token, secret) as { userId: string };
            return decoded;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    // Verify email
    static async verifyEmail(token: string) {
        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { email: string };

            // Find user with matching token
            const user = await prisma.user.findFirst({
                where: {
                    email: decoded.email,
                    email_verify_token: token,
                }
            });

            if (!user) {
                throw new Error('Invalid or expired verification token');
            }

            // Check if already verified
            if (user.email_verified_at) {
                throw new Error('Email already verified');
            }

            // Mark email as verified
            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: {
                    email_verified_at: new Date(),
                    email_verify_token: null,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    email_verified_at: true,
                }
            });

            return {
                message: 'Email verified successfully',
                user: updatedUser,
            };
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid or expired verification token');
            }
            throw error;
        }
    }

    // Forget Password 
    static async forgetPassword(data: ForgetPasswordInput) {
        try {
            const user = await prisma.user.findUnique({
                where: { email: data.email },
                select: {
                    id: true,
                    name: true,
                    email: true,
                }
            })
            if (!user) {
                throw new Error('User with this email does not exist');
            }

            // Generate password reset token
            const resetToken = this.generateToken(user.id.toString());

            // Store reset token in database
            await prisma.user.update({
                where: { email: data.email },
                data: {
                    password_reset_token: resetToken,
                    token_send_at: new Date(),
                }
            })

            // Generate reset URL
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?email=${data.email}&token=${resetToken}`;

            const emailBody = await renderEmailEjs("forget-password", {
                name: user.name,
                resetUrl: resetUrl,
            })

            // Send reset email
            await emailQueue.add('emailQueueName', {
                to: user.email,
                subject: "Reset your password - DocGenius",
                html: emailBody,
            });

            return {
                message: 'Password reset email sent successfully',
            };
        } catch (error) {
            console.error('❌ Forget Password error:', error);
            throw error;
        }
    }

    // Reset Password
    static async resetPassword(data: ResetPasswordInput) {
        try {
            const user = await prisma.user.findUnique({
                where: { email: data.email },
            })
            if (!user) {
                throw new Error('User with this email does not exist');
            }

            if (!user.password_reset_token) {
                throw new Error('Invalid or expired password reset token');
            }

            const hoursDiff = checkHourDiff(user.token_send_at!);
            if (hoursDiff > 2) {
                throw new Error('Invalid or expired password reset token');
            }

            // Verify token
            const isValid = this.verifyToken(user.password_reset_token);

            if (!isValid) {
                throw new Error('Invalid or expired password reset token');
            }

            const hashedPassword = await bcrypt.hash(data.password, 10);

            await prisma.user.update({
                where: { email: data.email },
                data: {
                    password: hashedPassword,
                    password_reset_token: null,
                    token_send_at: null,
                }
            })

        } catch (error) {
            console.error('❌ Reset Password error:', error);
            throw error;
        }
    }

    // Get user by ID
    static async getUserById(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                email_verified_at: true,
                created_at: true,
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }
}
