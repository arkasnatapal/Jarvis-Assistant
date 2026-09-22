import { io, Socket } from 'socket.io-client';
import { JarvisEvent, SystemStatusSnapshot } from '@jarvis/shared';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export class SocketService {
  private socket: Socket | null = null;

  public connect(
    onStatusUpdate: (status: SystemStatusSnapshot) => void,
    onEventReceived: (event: JarvisEvent) => void,
    onAssistantChunk: (data: { chunk: string; correlationId: string; isFinal: boolean }) => void,
    onAssistantCompleted: (data: { correlationId: string; sessionId: string; responseText: string; toolExecuted?: any }) => void,
    onError: (err: any) => void,
    onConnectionChange: (connected: boolean) => void
  ): Socket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      onConnectionChange(true);
    });

    this.socket.on('disconnect', () => {
      onConnectionChange(false);
    });

    this.socket.on('system.status', (status: SystemStatusSnapshot) => {
      onStatusUpdate(status);
    });

    this.socket.on('event', (event: JarvisEvent) => {
      onEventReceived(event);
    });

    this.socket.on('assistant.chunk', (data) => {
      onAssistantChunk(data);
    });

    this.socket.on('assistant.completed', (data) => {
      onAssistantCompleted(data);
    });

    this.socket.on('error', (err) => {
      onError(err);
    });

    return this.socket;
  }

  public sendMessage(content: string, sessionId: string, correlationId: string): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('WebSocket is not connected');
    }
    this.socket.emit('user.message', { content, sessionId, correlationId });
  }

  public sendConfirmationResponse(confirmationId: string, approved: boolean): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('user.confirmation_response', { confirmationId, approved });
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
