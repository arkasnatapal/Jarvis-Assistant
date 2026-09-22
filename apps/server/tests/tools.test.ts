import { describe, it, expect, beforeEach } from 'vitest';
import { toolRegistry, initializeTools } from '../src/tools/index.js';
import { CapabilityPermission, RiskLevel } from '@jarvis/shared';
import { z } from 'zod';

describe('Tool Registry', () => {
  beforeEach(() => {
    initializeTools();
  });

  it('registers and retrieves tools correctly', () => {
    const timeTool = toolRegistry.getTool('get_current_time');
    expect(timeTool).toBeDefined();
    expect(timeTool?.definition.name).toBe('get_current_time');
  });

  it('lists all registered tools', () => {
    const tools = toolRegistry.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain('get_current_time');
    expect(names).toContain('calculate');
    expect(names).toContain('get_system_status');
    expect(names).toContain('web_search');
    expect(names).toContain('jarvis_test');
  });

  it('handles invalid tool arguments cleanly', async () => {
    const result = await toolRegistry.executeTool('calculate', { expression: '' }, { sessionId: 'test', correlationId: 'test-uuid' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid arguments');
  });

  it('handles non-existent tool lookups cleanly', async () => {
    const result = await toolRegistry.executeTool('non_existent_tool', {}, { sessionId: 'test', correlationId: 'test-uuid' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found in registry');
  });

  it('executes jarvis_test tool successfully', async () => {
    const result = await toolRegistry.executeTool('jarvis_test', { component: 'unit_test' }, { sessionId: 'test', correlationId: 'test-uuid' });
    expect(result.success).toBe(true);
    expect((result.result as any).success).toBe(true);
  });
});
