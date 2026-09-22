import { describe, it, expect, beforeEach } from 'vitest';
import { orchestrator } from '../src/orchestrator/orchestrator.js';
import { initializeTools, toolRegistry } from '../src/tools/index.js';
import { eventBus } from '../src/events/event-bus.js';

describe('JARVIS Orchestrator', () => {
  beforeEach(() => {
    initializeTools();
  });

  it('handles general conversational prompts', async () => {
    const res = await orchestrator.handleRequest({
      sessionId: 'test-session-1',
      userPrompt: 'Hello JARVIS'
    });

    expect(res.sessionId).toBe('test-session-1');
    expect(res.responseText).toContain('JARVIS');
  });

  it('detects intent and executes time tool correctly', async () => {
    const res = await orchestrator.handleRequest({
      sessionId: 'test-session-2',
      userPrompt: 'What time is it?'
    });

    expect(res.toolExecuted).toBeDefined();
    expect(res.toolExecuted?.toolName).toBe('get_current_time');
    expect(res.toolExecuted?.success).toBe(true);
  });

  it('detects intent and executes calculator tool correctly', async () => {
    const res = await orchestrator.handleRequest({
      sessionId: 'test-session-3',
      userPrompt: 'Calculate 482 * 37'
    });

    expect(res.toolExecuted).toBeDefined();
    expect(res.toolExecuted?.toolName).toBe('calculate');
    expect(res.toolExecuted?.success).toBe(true);
    expect((res.toolExecuted?.result as any).result).toBe(17834);
  });

  it('executes jarvis_test diagnostic tool', async () => {
    const res = await orchestrator.handleRequest({
      sessionId: 'test-session-4',
      userPrompt: 'JARVIS, test yourself.'
    });

    expect(res.toolExecuted).toBeDefined();
    expect(res.toolExecuted?.toolName).toBe('jarvis_test');
    expect(res.toolExecuted?.success).toBe(true);
  });

  it('correctly handles close calculator intent and response synthesis', async () => {
    const unsub = eventBus.on('tool.confirmation_required', (evt) => {
      setTimeout(() => {
        toolRegistry.resolveConfirmation((evt.payload as any).confirmationId, true);
      }, 10);
    });

    try {
      const res = await orchestrator.handleRequest({
        sessionId: 'test-session-5',
        userPrompt: 'close calculator'
      });

      expect(res.toolExecuted).toBeDefined();
      expect(res.toolExecuted?.toolName).toBe('application_close');
      expect(res.responseText).not.toContain('Opening calculator');
    } finally {
      unsub();
    }
  });
});
