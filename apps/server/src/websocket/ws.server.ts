import { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { JarvisEvent } from '@jarvis/shared';
import { config } from '../config/index.js';
import { logger } from '../logging/logger.js';
import { eventBus } from '../events/event-bus.js';
import { orchestrator } from '../orchestrator/orchestrator.js';
import { getHealthStatus } from '../health/health.service.js';
import { localAgentGateway } from '../agent/local-agent.gateway.js';
import { toolRegistry } from '../tools/registry/tool.registry.js';

export class JarvisWebSocketServer {
  private io: SocketIOServer | null = null;
  private connectedSockets = new Set<Socket>();

  public initialize(httpServer: HttpServer): SocketIOServer {
    // Mount Local Agent Gateway WS server endpoint on /local-agent
    localAgentGateway.initialize(httpServer);

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: [config.WEB_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 10000,
      pingInterval: 25000
    });

    // Subscribe to EventBus and broadcast all typed events to WS clients
    eventBus.onAny((event: JarvisEvent) => {
      this.io?.emit('event', event);
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info({ socketId: socket.id }, 'Client connected to WebSocket server');
      this.connectedSockets.add(socket);

      // Send initial status snapshot with agent telemetry
      const health = getHealthStatus(this.connectedSockets.size);
      const agentInfo = localAgentGateway.getAgentInfo();
      socket.emit('system.status', { ...health.components, agent: agentInfo });

      // Emit system.connected event
      eventBus.emitEvent('system.connected', 'server', { socketId: socket.id }, uuidv4(), 'LOW');

      socket.on('client.ping', () => {
        const healthStatus = getHealthStatus(this.connectedSockets.size);
        const agent = localAgentGateway.getAgentInfo();
        socket.emit('system.status', { ...healthStatus.components, agent });
      });

      // Handle user HITL confirmation responses from Web HUD
      socket.on('user.confirmation_response', (data: { confirmationId: string; approved: boolean }) => {
        logger.info({ confirmationId: data.confirmationId, approved: data.approved }, 'Received user HITL confirmation response');
        toolRegistry.resolveConfirmation(data.confirmationId, data.approved);
      });

      socket.on('user.message', async (data: { content: string; sessionId?: string; correlationId?: string }) => {
        const correlationId = data.correlationId || uuidv4();
        const sessionId = data.sessionId || 'default-session';

        if (!data.content || !data.content.trim()) {
          socket.emit('error', {
            error: {
              code: 'INVALID_INPUT',
              message: 'Message content cannot be empty',
              requestId: correlationId,
              retryable: false
            }
          });
          return;
        }

        try {
          const result = await orchestrator.handleRequest(
            {
              sessionId,
              userPrompt: data.content,
              correlationId
            },
            {
              onChunk: (chunk: string) => {
                socket.emit('assistant.chunk', {
                  chunk,
                  correlationId,
                  isFinal: false
                });
              }
            }
          );

          socket.emit('assistant.completed', {
            correlationId,
            sessionId: result.sessionId,
            responseText: result.responseText,
            toolExecuted: result.toolExecuted
          });
        } catch (err: any) {
          logger.error({ err, socketId: socket.id }, 'Error processing user WebSocket message');
          socket.emit('error', {
            error: {
              code: 'ORCHESTRATOR_ERROR',
              message: err?.message || 'Failed to process request',
              requestId: correlationId,
              retryable: true
            }
          });
        }
      });

      socket.on('disconnect', (reason) => {
        logger.info({ socketId: socket.id, reason }, 'Client disconnected from WebSocket');
        this.connectedSockets.delete(socket);
      });
    });

    logger.info('WebSocket Server initialized successfully');
    return this.io;
  }

  public getConnectedClientsCount(): number {
    return this.connectedSockets.size;
  }
}

export const wsServer = new JarvisWebSocketServer();
