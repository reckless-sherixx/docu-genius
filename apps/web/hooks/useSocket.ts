"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface UseSocketOptions {
  organizationId?: string;
  autoConnect?: boolean;
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

interface MemberRoleUpdatedPayload {
  memberId: string;
  newRole: string;
  memberName: string;
  organizationId: string;
}

interface MemberRemovedPayload {
  memberId: string;
  memberName: string;
  organizationId: string;
}

type SocketEventCallback<T> = (data: T) => void;

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  onDocumentGenerated: (callback: SocketEventCallback<DocumentGeneratedPayload>) => () => void;
  onMemberJoined: (callback: SocketEventCallback<MemberJoinedPayload>) => () => void;
  onMemberRoleUpdated: (callback: SocketEventCallback<MemberRoleUpdatedPayload>) => () => void;
  onMemberRemoved: (callback: SocketEventCallback<MemberRemovedPayload>) => () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useSocket({ organizationId, autoConnect = true }: UseSocketOptions = {}): UseSocketReturn {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const token = session?.user?.token;

  // Initialize socket connection
  useEffect(() => {
    if (!token || !autoConnect) {
      return;
    }

    // Create socket connection
    socketRef.current = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
      
      // Join organization room if organizationId is provided
      if (organizationId) {
        socket.emit('join:organization', organizationId);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    return () => {
      if (socket) {
        if (organizationId) {
          socket.emit('leave:organization', organizationId);
        }
        socket.disconnect();
      }
    };
  }, [token, backendUrl, autoConnect, organizationId]);

  // Handle organization change
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected || !organizationId) return;

    socket.emit('join:organization', organizationId);

    return () => {
      socket.emit('leave:organization', organizationId);
    };
  }, [organizationId, isConnected]);

  // Subscribe to document generated events
  const onDocumentGenerated = useCallback((callback: SocketEventCallback<DocumentGeneratedPayload>) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('document:generated', callback);
    return () => {
      socket.off('document:generated', callback);
    };
  }, []);

  // Subscribe to member joined events
  const onMemberJoined = useCallback((callback: SocketEventCallback<MemberJoinedPayload>) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('member:joined', callback);
    return () => {
      socket.off('member:joined', callback);
    };
  }, []);

  // Subscribe to member role updated events
  const onMemberRoleUpdated = useCallback((callback: SocketEventCallback<MemberRoleUpdatedPayload>) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('member:roleUpdated', callback);
    return () => {
      socket.off('member:roleUpdated', callback);
    };
  }, []);

  // Subscribe to member removed events
  const onMemberRemoved = useCallback((callback: SocketEventCallback<MemberRemovedPayload>) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on('member:removed', callback);
    return () => {
      socket.off('member:removed', callback);
    };
  }, []);

  // Disconnect manually
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    onDocumentGenerated,
    onMemberJoined,
    onMemberRoleUpdated,
    onMemberRemoved,
    disconnect,
    reconnect,
  };
}

export type {
  DocumentGeneratedPayload,
  MemberJoinedPayload,
  MemberRoleUpdatedPayload,
  MemberRemovedPayload,
};
