import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'node:http';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { CapabilityPermission, LocalAgentInfo, LocalAgentState, ToolExecutionContext } from '@jarvis/shared';
import { logger } from '../logging/logger.js';
import { eventBus } from '../events/event-bus.js';

interface PendingRequest {
  resolve: (value: { success: boolean; result?: unknown; error?: string }) => void;
  reject: (reason: any) => void;
  timer: NodeJS.Timeout;
  capability: string;
  correlationId: string;
}

function serializePayload(payload: any): string {
  if (!payload || typeof payload !== 'object') {
    return JSON.stringify(payload);
  }
  const sorted: Record<string, any> = {};
  Object.keys(payload).sort().forEach((key) => {
    sorted[key] = payload[key];
  });
  return JSON.stringify(sorted);
}

export class LocalAgentGateway {
  private wss: WebSocketServer | null = null;
  private agentSocket: WebSocket | null = null;
  private pairingSecret: string = '';
  private agentInfo: LocalAgentInfo = {
    agentId: 'jarvis-win-agent-01',
    platform: 'windows',
    version: '0.3.0',
    status: 'OFFLINE',
    capabilities: [],
    lastHeartbeat: 0,
    latencyMs: 0,
    killSwitchActive: false
  };

  private pendingRequests = new Map<string, PendingRequest>();

  constructor() {
    this.loadOrCreatePairingSecret();
  }

  private loadOrCreatePairingSecret(): string {
    const credDir = path.join(os.homedir(), '.jarvis');
    const secretFile = path.join(credDir, 'local_agent_pairing.key');

    if (!fs.existsSync(credDir)) {
      try {
        fs.mkdirSync(credDir, { recursive: true });
      } catch (e) {
        // Fallback
      }
    }

    if (fs.existsSync(secretFile)) {
      try {
        const key = fs.readFileSync(secretFile, 'utf-8').trim();
        if (key.length >= 32) {
          this.pairingSecret = key;
          return key;
        }
      } catch (e) {
        // Ignore
      }
    }

    // Generate new default secret
    this.pairingSecret = crypto.randomBytes(32).toString('hex');
    try {
      fs.writeFileSync(secretFile, this.pairingSecret, 'utf-8');
    } catch (e) {
      logger.warn({ err: e }, 'Failed to save pairing secret key');
    }
    return this.pairingSecret;
  }

  public initialize(server: HttpServer): void {
    // Use noServer: true to avoid upgrade listener conflicts with Socket.IO
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      try {
        const reqUrl = request.url || '';
        const pathname = reqUrl.split('?')[0];

        if (pathname === '/local-agent') {
          this.wss?.handleUpgrade(request, socket, head, (ws) => {
            this.wss?.emit('connection', ws, request);
          });
        }
      } catch (err) {
        logger.error({ err }, 'Error during HTTP upgrade for Local Agent');
      }
    });

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('Local Agent attempting WebSocket connection on /local-agent');

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString('utf-8'));
          this.handleIncomingMessage(ws, msg);
        } catch (err: any) {
          logger.error({ err }, 'Error parsing message from Local Agent');
        }
      });

      ws.on('close', () => {
        if (this.agentSocket === ws) {
          logger.warn('Local Agent WebSocket disconnected');
          this.agentSocket = null;
          this.agentInfo.status = 'OFFLINE';
          eventBus.emitEvent('agent.disconnected', 'local_agent', { agentId: this.agentInfo.agentId }, uuidv4(), 'HIGH');
        }
      });

      ws.on('error', (err) => {
        logger.error({ err }, 'Local Agent WebSocket error');
      });
    });

    logger.info('Local Agent Gateway initialized on path /local-agent');
  }

  private handleIncomingMessage(ws: WebSocket, msg: any): void {
    const type = msg.type;

    if (type === 'agent.handshake') {
      const { agentId, timestamp, nonce, signature, payload } = msg;
      const payloadStr = serializePayload(payload);
      
      const expectedSig = this.computeHmac(timestamp, nonce, payloadStr);
      if (signature !== expectedSig) {
        logger.warn({ agentId, signature, expectedSig }, 'Agent handshake failed: Invalid HMAC signature');
        ws.send(jsonStr({ type: 'error', message: 'UNAUTHENTICATED: Invalid signature' }));
        ws.close();
        return;
      }

      this.agentSocket = ws;
      this.agentInfo = {
        agentId: payload.agentId || agentId,
        platform: payload.platform || 'windows',
        version: payload.version || '0.3.0',
        status: payload.killSwitchActive ? 'REMOTE_CONTROL_DISABLED' : 'ONLINE',
        capabilities: payload.capabilities || [],
        lastHeartbeat: Date.now(),
        latencyMs: 1,
        killSwitchActive: !!payload.killSwitchActive
      };

      logger.info({ agentId: this.agentInfo.agentId, capabilities: this.agentInfo.capabilities.length }, 'Local Agent authenticated and paired successfully!');
      
      eventBus.emitEvent('agent.connected', 'local_agent', { ...this.agentInfo }, uuidv4(), 'HIGH');
      eventBus.emitEvent('agent.authenticated', 'local_agent', { agentId: this.agentInfo.agentId }, uuidv4(), 'LOW');
      eventBus.emitEvent('agent.capabilities.updated', 'local_agent', { capabilities: this.agentInfo.capabilities }, uuidv4(), 'LOW');

      ws.send(jsonStr({ type: 'handshake_ack', success: true, status: this.agentInfo.status }));
      return;
    }

    if (type === 'agent.heartbeat') {
      this.agentInfo.lastHeartbeat = Date.now();
      this.agentInfo.killSwitchActive = !!msg.killSwitchActive;
      if (msg.killSwitchActive) {
        this.agentInfo.status = 'REMOTE_CONTROL_DISABLED';
      } else if (this.agentInfo.status === 'REMOTE_CONTROL_DISABLED') {
        this.agentInfo.status = 'ONLINE';
      }

      eventBus.emitEvent('agent.heartbeat', 'local_agent', { agentId: this.agentInfo.agentId, status: this.agentInfo.status }, uuidv4(), 'LOW');
      return;
    }

    if (type === 'agent.kill_switch.activated') {
      logger.warn({ reason: msg.reason }, 'EMERGENCY KILL SWITCH ACTIVATED BY LOCAL AGENT');
      this.agentInfo.killSwitchActive = true;
      this.agentInfo.status = 'REMOTE_CONTROL_DISABLED';
      
      eventBus.emitEvent('agent.kill_switch.activated', 'local_agent', { reason: msg.reason }, uuidv4(), 'URGENT');
      return;
    }

    if (type === 'rpc_response') {
      const { requestId, payload, error } = msg;
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(requestId);

        if (payload?.error || error) {
          pending.resolve({ success: false, error: payload?.error || error });
        } else {
          pending.resolve({ success: true, result: payload?.result });
        }
      }
      return;
    }
  }

  public async executeCapability(
    capability: string,
    payload: Record<string, unknown>,
    context: ToolExecutionContext,
    timeoutMs: number = 10000
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    if (this.agentInfo.status === 'OFFLINE' || !this.agentSocket || this.agentSocket.readyState !== WebSocket.OPEN) {
      return {
        success: false,
        error: 'Local Agent is OFFLINE. Desktop operations are currently unavailable.'
      };
    }

    if (this.agentInfo.killSwitchActive || this.agentInfo.status === 'REMOTE_CONTROL_DISABLED') {
      return {
        success: false,
        error: 'REMOTE CONTROL DISABLED: Emergency kill switch is active on host Windows machine.'
      };
    }

    if (!this.agentInfo.capabilities.includes(capability)) {
      return {
        success: false,
        error: `Capability '${capability}' is not advertised by connected Local Agent.`
      };
    }

    const requestId = uuidv4();
    const correlationId = context.correlationId || uuidv4();
    const timestamp = Date.now();
    const nonce = uuidv4();

    const payloadStr = serializePayload(payload);
    const signature = this.computeHmac(timestamp, nonce, payloadStr);

    const reqMsg = {
      type: 'rpc_request',
      requestId,
      correlationId,
      timestamp,
      nonce,
      capability,
      payload,
      signature
    };

    eventBus.emitEvent('agent.command.requested', 'local_agent', { capability, requestId }, correlationId, 'LOW');

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        eventBus.emitEvent('agent.command.failed', 'local_agent', { capability, requestId, error: 'Timed out' }, correlationId, 'HIGH');
        resolve({ success: false, error: `Local Agent capability '${capability}' timed out after ${timeoutMs}ms.` });
      }, timeoutMs);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timer,
        capability,
        correlationId
      });

      try {
        this.agentSocket!.send(JSON.stringify(reqMsg));
      } catch (err: any) {
        clearTimeout(timer);
        this.pendingRequests.delete(requestId);
        resolve({ success: false, error: `Failed to dispatch payload to Local Agent: ${err.message}` });
      }
    });
  }

  public getAgentInfo(): LocalAgentInfo {
    return { ...this.agentInfo };
  }

  public resetKillSwitch(): void {
    this.agentInfo.killSwitchActive = false;
    if (this.agentInfo.status === 'REMOTE_CONTROL_DISABLED') {
      this.agentInfo.status = 'ONLINE';
    }
  }

  private computeHmac(timestamp: number, nonce: string, payloadStr: string): string {
    const message = `${timestamp}:${nonce}:${payloadStr}`;
    return crypto.createHmac('sha256', this.pairingSecret).update(message).digest('hex');
  }
}

function jsonStr(obj: any): string {
  return JSON.stringify(obj);
}

export const localAgentGateway = new LocalAgentGateway();
