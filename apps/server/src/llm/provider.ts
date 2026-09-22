import { ChatMessage, ToolDefinition } from '@jarvis/shared';

export interface LLMToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LLMGenerateResponse {
  content: string | null;
  toolCalls?: LLMToolCall[];
}

export interface LLMStreamChunk {
  contentChunk?: string;
  toolCallChunk?: Partial<LLMToolCall>;
  isFinal: boolean;
}

export interface LLMProvider {
  id: string;
  name: string;
  generateResponse(
    messages: ChatMessage[],
    availableTools?: ToolDefinition[]
  ): Promise<LLMGenerateResponse>;

  streamResponse(
    messages: ChatMessage[],
    availableTools: ToolDefinition[] | undefined,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMGenerateResponse>;
}
