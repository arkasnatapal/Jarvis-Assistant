import { z } from 'zod';
import { JarvisEvent } from '../events/schemas.js';

export enum RiskLevel {
  SAFE = 'SAFE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum CapabilityPermission {
  SYSTEM_READ = 'SYSTEM_READ',
  SYSTEM_TIME = 'SYSTEM_TIME',
  MATH_EVAL = 'MATH_EVAL',
  WEB_SEARCH = 'WEB_SEARCH',
  JARVIS_TEST = 'JARVIS_TEST',
  FILE_READ = 'FILE_READ',
  FILE_WRITE = 'FILE_WRITE',
  FILESYSTEM_READ = 'FILESYSTEM_READ',
  TERMINAL_EXECUTE = 'TERMINAL_EXECUTE',
  MEDIA_PLAY = 'MEDIA_PLAY',
  BROWSER_OPEN = 'BROWSER_OPEN',
  // Phase 3 Desktop Capabilities
  SYSTEM_STATUS = 'SYSTEM_STATUS',
  SYSTEM_INFO = 'SYSTEM_INFO',
  SYSTEM_UPTIME = 'SYSTEM_UPTIME',
  APPLICATION_LIST = 'APPLICATION_LIST',
  APPLICATION_LAUNCH = 'APPLICATION_LAUNCH',
  APPLICATION_CLOSE = 'APPLICATION_CLOSE',
  WINDOW_LIST = 'WINDOW_LIST',
  WINDOW_FOCUS = 'WINDOW_FOCUS',
  WINDOW_MINIMIZE = 'WINDOW_MINIMIZE',
  WINDOW_MAXIMIZE = 'WINDOW_MAXIMIZE',
  FILESYSTEM_LIST = 'FILESYSTEM_LIST',
  FILESYSTEM_EXISTS = 'FILESYSTEM_EXISTS'
}

export enum PermissionDecisionState {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  REQUIRE_CONFIRMATION = 'REQUIRE_CONFIRMATION'
}

export interface PermissionDecision {
  state: PermissionDecisionState;
  capability: CapabilityPermission;
  reason: string;
}

export interface ToolDefinition<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: TInput;
  outputSchema?: z.ZodTypeAny;
  riskLevel: RiskLevel;
  requiredCapability: CapabilityPermission;
  requiresConfirmation: boolean;
  timeoutMs: number;
}

export interface ToolExecutionContext {
  sessionId: string;
  correlationId: string;
  userId?: string;
}

export type LocalAgentState = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'REMOTE_CONTROL_DISABLED';

export interface LocalAgentInfo {
  agentId: string;
  platform: string;
  version: string;
  status: LocalAgentState;
  capabilities: string[];
  lastHeartbeat: number;
  latencyMs?: number;
  killSwitchActive: boolean;
}

export interface ConfirmationRequest {
  confirmationId: string;
  toolName: string;
  capability: CapabilityPermission;
  riskLevel: RiskLevel;
  actionDescription: string;
  target: string;
  reason: string;
  correlationId: string;
}

export interface ConfirmationResponse {
  confirmationId: string;
  approved: boolean;
}

export interface SystemStatusSnapshot {
  core: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  server: 'ONLINE' | 'OFFLINE';
  llm: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  websocket: 'CONNECTED' | 'DISCONNECTED';
  tools: 'READY' | 'DEGRADED' | 'UNAVAILABLE';
  agent?: LocalAgentInfo;
}

export interface ChatMessage {
  messageId: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  correlationId?: string;
}

export interface JarvisSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

export interface ClientMessagePayload {
  content: string;
  sessionId: string;
  correlationId?: string;
}

export interface AssistantChunkPayload {
  chunk: string;
  correlationId: string;
  isFinal: boolean;
}

export interface StructuredError {
  error: {
    code: string;
    message: string;
    requestId?: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
}

export enum VoiceState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  TRANSCRIBING = 'TRANSCRIBING',
  THINKING = 'THINKING',
  EXECUTING = 'EXECUTING',
  SPEAKING = 'SPEAKING',
  INTERRUPTED = 'INTERRUPTED',
  ERROR = 'ERROR'
}

export type SupportedLanguage = 'en' | 'hi' | 'bn' | 'hinglish' | 'banglish';

export interface LanguageMetadata {
  language: SupportedLanguage;
  confidence: number;
}

export interface AudioInput {
  audioBlob?: unknown;
  audioData?: ArrayBuffer;
  sampleRate?: number;
  mimeType?: string;
}

export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  language?: LanguageMetadata;
}

export interface STTOptions {
  language?: SupportedLanguage;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  language?: SupportedLanguage;
}

export interface AudioOutput {
  audioUrl?: string;
  audioBuffer?: ArrayBuffer;
  mimeType?: string;
}


