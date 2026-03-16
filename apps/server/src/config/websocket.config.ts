import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
    userId?: string;
    organizationIds?: string[];
}

interface DocumentGeneratedPayload {
    documentId: string;
    templateName: string;
    userName: string;
    userEmail: string;
    organizationId: string;
    createdAt: string;
}

interface MemberJoinedPayload {
    memberId: string;
    userName: string;
    userEmail: string;
    organizationId: string;
    role: string;
    joinedAt: string;
}

export const initializeSocketIO = (httpServer: HttpServer): Server => {
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.NEXT_PUBLIC_FRONTEND_URL,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ].filter(Boolean) as string[];

    io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                // Allow same-origin or tools that omit origin header.
                if (!origin) {
                    callback(null, true);
                    return;
                }

                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                    return;
                }

                callback(new Error(`Origin ${origin} is not allowed by Socket.IO CORS`));
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    io.use((socket: AuthenticatedSocket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: string };
            socket.userId = decoded.id;
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
        socket.on('join:organization', (organizationId: string) => {
            if (!organizationId) return;

            socket.join(`org:${organizationId}`);
        });

        socket.on('leave:organization', (organizationId: string) => {
            if (!organizationId) return;

            socket.leave(`org:${organizationId}`);
        });

        socket.on('disconnect', (reason) => {
        });

        socket.on('error', (error) => {
            console.error(`Socket error for user ${socket.userId}:`, error);
        });
    });

    return io;
};

export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.IO has not been initialized. Call initializeSocketIO first.');
    }
    return io;
};

export const emitDocumentGenerated = (payload: DocumentGeneratedPayload) => {
    if (!io) {
        console.warn('Socket.IO not initialized, cannot emit document:generated event');
        return;
    }

    io.to(`org:${payload.organizationId}`).emit('document:generated', payload);
};

export const emitMemberJoined = (payload: MemberJoinedPayload) => {
    if (!io) {
        console.warn('Socket.IO not initialized, cannot emit member:joined event');
        return;
    }

    io.to(`org:${payload.organizationId}`).emit('member:joined', payload);
};

export const emitMemberRoleUpdated = (organizationId: string, memberId: string, newRole: string, memberName: string) => {
    if (!io) {
        console.warn('Socket.IO not initialized, cannot emit member:roleUpdated event');
        return;
    }

    io.to(`org:${organizationId}`).emit('member:roleUpdated', {
        memberId,
        newRole,
        memberName,
        organizationId,
    });
};

export const emitMemberRemoved = (organizationId: string, memberId: string, memberName: string) => {
    if (!io) {
        console.warn('Socket.IO not initialized, cannot emit member:removed event');
        return;
    }

    io.to(`org:${organizationId}`).emit('member:removed', {
        memberId,
        memberName,
        organizationId,
    });
};

export default {
    initializeSocketIO,
    getIO,
    emitDocumentGenerated,
    emitMemberJoined,
    emitMemberRoleUpdated,
    emitMemberRemoved,
};
