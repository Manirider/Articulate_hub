import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const isDev = process.env.NODE_ENV === 'development';
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      if (isDev) console.log('[Socket.IO] Connected:', socket?.id);
      window.dispatchEvent(new CustomEvent('socket_status', { detail: 'connected' }));
    });

    socket.on('disconnect', (reason) => {
      if (isDev) console.warn('[Socket.IO] Disconnected:', reason);
      window.dispatchEvent(new CustomEvent('socket_status', { detail: 'disconnected' }));
    });

    socket.on('connect_error', (err) => {
      if (isDev) console.warn('[Socket.IO] Connection error:', err.message);
      window.dispatchEvent(new CustomEvent('socket_status', { detail: 'error' }));
    });

    socket.on('reconnect_attempt', (attempt) => {
      if (isDev) console.log(`[Socket.IO] Reconnect attempt ${attempt}`);
      window.dispatchEvent(new CustomEvent('socket_status', { detail: 'reconnecting' }));
    });

    socket.on('reconnect', () => {
      if (isDev) console.log('[Socket.IO] Reconnected successfully');
      window.dispatchEvent(new CustomEvent('socket_status', { detail: 'connected' }));
    });
  }
  return socket;
}

/** Dispose the socket connection (e.g. on logout) */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
