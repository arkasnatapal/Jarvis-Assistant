import { describe, it, expect } from 'vitest';
import { permissionEngine } from '../src/permissions/permission.engine.js';
import { CapabilityPermission, PermissionDecisionState, RiskLevel, ToolDefinition } from '@jarvis/shared';
import { z } from 'zod';

describe('Permission Engine', () => {
  it('allows SAFE tools with granted capabilities', () => {
    const safeTool: ToolDefinition = {
      name: 'test_safe',
      description: 'safe test tool',
      inputSchema: z.object({}),
      riskLevel: RiskLevel.SAFE,
      requiredCapability: CapabilityPermission.SYSTEM_TIME,
      requiresConfirmation: false,
      timeoutMs: 1000
    };

    const decision = permissionEngine.evaluatePermission(safeTool, {});
    expect(decision.state).toBe(PermissionDecisionState.ALLOW);
  });

  it('denies tools with ungranted capabilities', () => {
    const ungrantedTool: ToolDefinition = {
      name: 'test_ungranted',
      description: 'ungranted test tool',
      inputSchema: z.object({}),
      riskLevel: RiskLevel.SAFE,
      requiredCapability: CapabilityPermission.TERMINAL_EXECUTE,
      requiresConfirmation: false,
      timeoutMs: 1000
    };

    const decision = permissionEngine.evaluatePermission(ungrantedTool, {});
    expect(decision.state).toBe(PermissionDecisionState.DENY);
  });

  it('requires explicit confirmation for HIGH risk tools', () => {
    const highRiskTool: ToolDefinition = {
      name: 'test_high_risk',
      description: 'high risk tool',
      inputSchema: z.object({}),
      riskLevel: RiskLevel.HIGH,
      requiredCapability: CapabilityPermission.FILE_WRITE,
      requiresConfirmation: true,
      timeoutMs: 1000
    };

    const decision = permissionEngine.evaluatePermission(highRiskTool, {});
    expect(decision.state).toBe(PermissionDecisionState.REQUIRE_CONFIRMATION);
  });
});
