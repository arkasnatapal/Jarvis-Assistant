import { ChatMessage, ToolDefinition, buildJarvisSystemPrompt } from '@jarvis/shared';
import { LLMGenerateResponse, LLMProvider, LLMStreamChunk } from '../provider.js';
import { config } from '../../config/index.js';
import { logger } from '../../logging/logger.js';
import { MockLLMProvider } from './mock.provider.js';

export class OpenAICompatibleProvider implements LLMProvider {
  public id: string;
  public name: string;
  private fallbackMock = new MockLLMProvider();

  constructor(id: string = 'openai', name: string = 'OpenAI Compatible Provider') {
    this.id = id;
    this.name = name;
  }

  public async generateResponse(
    messages: ChatMessage[],
    availableTools?: ToolDefinition[]
  ): Promise<LLMGenerateResponse> {
    const isKeyRequired = config.LLM_PROVIDER !== 'ollama' && config.LLM_PROVIDER !== 'mock';
    if (isKeyRequired && !config.LLM_API_KEY) {
      logger.warn({ providerId: this.id }, 'LLM API key not configured. Falling back to Mock LLM provider.');
      return this.fallbackMock.generateResponse(messages, availableTools);
    }

    try {
      const formattedMessages = messages.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const toolsPayload = availableTools?.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'object',
            properties: (t.inputSchema as any)?._def?.shape ? this.zodShapeToJsonSchema((t.inputSchema as any)._def.shape) : {}
          }
        }
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (config.LLM_API_KEY) {
        headers['Authorization'] = `Bearer ${config.LLM_API_KEY}`;
      }

      logger.debug({ provider: this.id, baseUrl: config.LLM_BASE_URL, model: config.LLM_MODEL }, 'Sending LLM request');

      // Alias non-standard Gemini model names to active Google API endpoint models (gemini-3.6-flash)
      let modelToUse = config.LLM_MODEL;
      if (config.LLM_PROVIDER === 'gemini' && (modelToUse === 'gemini-3.5-flash-lite' || modelToUse.includes('3.5') || modelToUse.includes('2.0'))) {
        modelToUse = 'gemini-3.6-flash';
      }

      const timeoutMs = config.NODE_ENV === 'test' ? 1500 : 5000;
      const response = await fetch(`${config.LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'system', content: buildJarvisSystemPrompt() },
            ...formattedMessages
          ],
          tools: toolsPayload && toolsPayload.length > 0 ? toolsPayload : undefined,
          tool_choice: toolsPayload && toolsPayload.length > 0 ? 'auto' : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          logger.warn({ status: 429, provider: this.id }, 'LLM API rate limit / quota exceeded. Graceful instant fallback to Mock provider.');
        } else {
          logger.error({ status: response.status, errorText, provider: this.id }, 'LLM API request failed');
        }
        return this.fallbackMock.generateResponse(messages, availableTools);
      }

      const data = (await response.json()) as any;
      const choice = data.choices?.[0]?.message;

      if (!choice) {
        throw new Error(`No choice message returned from LLM provider '${this.id}'`);
      }

      if (choice.tool_calls && choice.tool_calls.length > 0) {
        const toolCall = choice.tool_calls[0];
        let parsedArgs = {};
        try {
          parsedArgs = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments || '{}')
            : toolCall.function.arguments || {};
        } catch {
          parsedArgs = {};
        }

        return {
          content: null,
          toolCalls: [
            {
              id: toolCall.id || `call_${Date.now()}`,
              name: toolCall.function.name,
              args: parsedArgs
            }
          ]
        };
      }

      return {
        content: choice.content || ''
      };
    } catch (err: any) {
      logger.error({ err: err?.message, provider: this.id }, 'Error calling LLM provider. Graceful fallback to Mock provider.');
      return this.fallbackMock.generateResponse(messages, availableTools);
    }
  }

  public async streamResponse(
    messages: ChatMessage[],
    availableTools: ToolDefinition[] | undefined,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMGenerateResponse> {
    const res = await this.generateResponse(messages, availableTools);

    if (res.toolCalls && res.toolCalls.length > 0) {
      onChunk({ isFinal: true, toolCallChunk: res.toolCalls[0] });
      return res;
    }

    const text = res.content || '';
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i === words.length - 1 ? '' : ' ');
      onChunk({ contentChunk: word, isFinal: false });
      await new Promise((r) => setTimeout(r, 20));
    }

    onChunk({ isFinal: true });
    return res;
  }

  private zodShapeToJsonSchema(shape: Record<string, any>): Record<string, any> {
    const props: Record<string, any> = {};
    for (const [key, value] of Object.entries(shape)) {
      props[key] = {
        type: 'string',
        description: value?.description || key
      };
    }
    return props;
  }
}
