import { SystemStatusSnapshot, JarvisEvent } from '@jarvis/shared';

export interface DisplayMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  toolExecuted?: {
    toolName: string;
    success: boolean;
    result?: unknown;
    error?: string;
  };
}

export type ComponentStatusMap = SystemStatusSnapshot;
