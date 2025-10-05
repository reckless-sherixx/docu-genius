import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { RegisterInput, LoginInput } from '../schemas/auth.schema.js';

export class AuthService {

    // Register a new user
    static async register(data: RegisterInput) {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                created_at: true,
            }
        });

        // Generate JWT token
        const token = this.generateToken(user.id.toString());

        return {
            user,
            token,
        };
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

        // Generate JWT token
        const token = this.generateToken(user.id.toString());

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            token,
        };
    }

    // Generate JWT token
    private static generateToken(userId: string): string {
        const secret = process.env.JWT_SECRET || 'your-secret-key';
        const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

        return jwt.sign(
            { userId },
            secret,
            { expiresIn }
        );
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

    // Get user by ID
    static async getUserById(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: {
                id: true,
                name: true,
                email: true,
                created_at: true,
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }
}
