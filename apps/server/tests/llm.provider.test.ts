import { describe, it, expect } from 'vitest';
import { llmRegistry } from '../src/llm/registry.js';
import { MockLLMProvider } from '../src/llm/providers/mock.provider.js';
import { OpenAICompatibleProvider } from '../src/llm/providers/openai.provider.js';
import { config } from '../src/config/index.js';
import { ChatMessage } from '@jarvis/shared';

describe('LLM Provider Selection & Fallback Suite', () => {
  it('returns active provider matching configured LLM_PROVIDER', () => {
    const provider = llmRegistry.getActiveProvider();
    expect(provider).toBeDefined();
    expect(provider.id).toBe(config.LLM_PROVIDER);
  });

  it('MockLLMProvider generates deterministic intent for time and calculate queries', async () => {
    const mock = new MockLLMProvider();

    const timeMsg: ChatMessage[] = [
      { messageId: '1', sessionId: 's1', role: 'user', content: 'What time is it?', timestamp: Date.now() }
    ];
    const timeRes = await mock.generateResponse(timeMsg);
    expect(timeRes.toolCalls).toBeDefined();
    expect(timeRes.toolCalls?.[0].name).toBe('get_current_time');

    const calcMsg: ChatMessage[] = [
      { messageId: '2', sessionId: 's1', role: 'user', content: 'Calculate 482 * 37', timestamp: Date.now() }
    ];
    const calcRes = await mock.generateResponse(calcMsg);
    expect(calcRes.toolCalls).toBeDefined();
    expect(calcRes.toolCalls?.[0].name).toBe('calculate');
    expect(calcRes.toolCalls?.[0].args.expression).toBe('482 * 37');
  });

  it('OpenAICompatibleProvider falls back gracefully to MockLLMProvider when API key is invalid or missing', async () => {
    const provider = new OpenAICompatibleProvider('gemini', 'Google Gemini Provider');
    const msg: ChatMessage[] = [
      { messageId: '1', sessionId: 's1', role: 'user', content: 'Hello JARVIS', timestamp: Date.now() }
    ];

    const res = await provider.generateResponse(msg);
    expect(res).toBeDefined();
    expect(res.content || res.toolCalls).toBeDefined();
  });

  it('OpenAICompatibleProvider streams chunks properly during fallback', async () => {
    const provider = new OpenAICompatibleProvider('openai', 'OpenAI Provider');
    const msg: ChatMessage[] = [
      { messageId: '1', sessionId: 's1', role: 'user', content: 'Hello JARVIS', timestamp: Date.now() }
    ];

    const chunks: string[] = [];
    await provider.streamResponse(msg, undefined, (chunk) => {
      if (chunk.contentChunk) {
        chunks.push(chunk.contentChunk);
      }
    });

    expect(chunks.length).toBeGreaterThan(0);
  });
});
