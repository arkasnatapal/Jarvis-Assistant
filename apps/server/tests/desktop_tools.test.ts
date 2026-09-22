import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { toolRegistry, initializeTools } from '../src/tools/index.js';
import { permissionEngine } from '../src/permissions/permission.engine.js';
import { localAgentGateway } from '../src/agent/local-agent.gateway.js';
import { CapabilityPermission, PermissionDecisionState, RiskLevel } from '@jarvis/shared';

describe('Phase 3 Desktop Tools & Local Agent Gateway', () => {
  beforeAll(() => {
    initializeTools();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers all 13 Phase 3 desktop tools in toolRegistry', () => {
    const tools = toolRegistry.listTools();
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).toContain('system_status');
    expect(toolNames).toContain('system_info');
    expect(toolNames).toContain('system_uptime');
    expect(toolNames).toContain('application_list');
    expect(toolNames).toContain('application_launch');
    expect(toolNames).toContain('application_close');
    expect(toolNames).toContain('window_list');
    expect(toolNames).toContain('window_focus');
    expect(toolNames).toContain('window_minimize');
    expect(toolNames).toContain('window_maximize');
    expect(toolNames).toContain('filesystem_list');
    expect(toolNames).toContain('filesystem_read');
    expect(toolNames).toContain('filesystem_exists');
  });

  it('evaluates LOW and MEDIUM risk desktop capabilities as ALLOWED', () => {
    const statusTool = toolRegistry.getTool('system_status')?.definition!;
    const launchTool = toolRegistry.getTool('application_launch')?.definition!;

    expect(permissionEngine.evaluatePermission(statusTool, {}).state).toBe(PermissionDecisionState.ALLOW);
    expect(permissionEngine.evaluatePermission(launchTool, { applicationId: 'vscode' }).state).toBe(PermissionDecisionState.ALLOW);
  });

  it('evaluates application_close as REQUIRE_CONFIRMATION due to HIGH risk rating', () => {
    const closeTool = toolRegistry.getTool('application_close')?.definition!;
    const decision = permissionEngine.evaluatePermission(closeTool, { applicationId: 'chrome' });

    expect(decision.state).toBe(PermissionDecisionState.REQUIRE_CONFIRMATION);
  });

  it('returns OFFLINE error when Local Agent is not connected', async () => {
    const res = await toolRegistry.executeTool(
      'system_status',
      {},
      { sessionId: 'test-sess', correlationId: 'corr-001' }
    );

    expect(res.success).toBe(true);
    const agentRes = res.result as any;
    expect(agentRes.success).toBe(false);
    expect(agentRes.error).toContain('Local Agent is OFFLINE');
  });

  it('prohibits arbitrary application launch IDs outside the Zod schema allowlist', async () => {
    const res = await toolRegistry.executeTool(
      'application_launch',
      { applicationId: 'malicious_exe' },
      { sessionId: 'test-sess', correlationId: 'corr-002' }
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid arguments');
  });

  it('executes capability through localAgentGateway when agent is mocked ONLINE', async () => {
    // Mock localAgentGateway.executeCapability
    const executeSpy = vi.spyOn(localAgentGateway, 'executeCapability').mockResolvedValue({
      success: true,
      result: {
        cpu_usage_percent: 15.4,
        memory: { percent: 45.2, total_gb: 16.0 },
        os: 'Windows 11'
      }
    });

    const res = await toolRegistry.executeTool(
      'system_status',
      {},
      { sessionId: 'test-sess', correlationId: 'corr-003' }
    );

    expect(res.success).toBe(true);
    expect(res.result).toMatchObject({
      success: true,
      result: {
        cpu_usage_percent: 15.4,
        memory: { percent: 45.2, total_gb: 16.0 },
        os: 'Windows 11'
      }
    });
    expect(executeSpy).toHaveBeenCalledWith('system.status', {}, expect.anything());
  });

  it('handles HITL confirmation flow when application_close is requested', async () => {
    const executeSpy = vi.spyOn(localAgentGateway, 'executeCapability').mockResolvedValue({
      success: true,
      result: { terminatedCount: 1, message: 'Closed 1 process instance of Google Chrome.' }
    });

    // Start executing tool requiring confirmation in async background promise
    const toolExecPromise = toolRegistry.executeTool(
      'application_close',
      { applicationId: 'chrome' },
      { sessionId: 'test-sess', correlationId: 'corr-004' }
    );

    // Give event queue a tick to emit tool.confirmation_required
    await new Promise((r) => setTimeout(r, 50));

    // Simulate user approving confirmation in Web HUD
    const pendingKeys = Array.from((toolRegistry as any).pendingConfirmations.keys());
    expect(pendingKeys.length).toBeGreaterThan(0);

    const resolveSuccess = toolRegistry.resolveConfirmation(
      pendingKeys[0] as string,
      true
    );

    expect(resolveSuccess).toBe(true);

    const res = await toolExecPromise;
    expect(res.success).toBe(true);
    expect(executeSpy).toHaveBeenCalledWith('application.close', { applicationId: 'chrome' }, expect.anything());
  });
});
