import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { RegisterInput, LoginInput } from '../schemas/auth.schema.js';
import { renderEmailEjs } from '../lib/helper.js';
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
                token: `Bearer ${authToken}`,
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
            token : `Bearer ${token}`,
        };
    }

    // Login Check Route
    static async loginCheck(data: LoginInput){
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

    // Get user by ID
    static async getUserById(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
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
