import { CapabilityPermission, PermissionDecision, PermissionDecisionState, RiskLevel, ToolDefinition } from '@jarvis/shared';
import { logger } from '../logging/logger.js';

class PermissionEngine {
  private allowedCapabilities = new Set<CapabilityPermission>([
    CapabilityPermission.SYSTEM_TIME,
    CapabilityPermission.MATH_EVAL,
    CapabilityPermission.SYSTEM_READ,
    CapabilityPermission.WEB_SEARCH,
    CapabilityPermission.JARVIS_TEST,
    CapabilityPermission.MEDIA_PLAY,
    CapabilityPermission.BROWSER_OPEN,
    // Phase 3 Desktop Capabilities
    CapabilityPermission.SYSTEM_STATUS,
    CapabilityPermission.SYSTEM_INFO,
    CapabilityPermission.SYSTEM_UPTIME,
    CapabilityPermission.APPLICATION_LIST,
    CapabilityPermission.APPLICATION_LAUNCH,
    CapabilityPermission.APPLICATION_CLOSE,
    CapabilityPermission.WINDOW_LIST,
    CapabilityPermission.WINDOW_FOCUS,
    CapabilityPermission.WINDOW_MINIMIZE,
    CapabilityPermission.WINDOW_MAXIMIZE,
    CapabilityPermission.FILESYSTEM_LIST,
    CapabilityPermission.FILESYSTEM_READ,
    CapabilityPermission.FILESYSTEM_EXISTS
  ]);

  public evaluatePermission(tool: ToolDefinition, args: Record<string, unknown>): PermissionDecision {
    logger.debug({ toolName: tool.name, capability: tool.requiredCapability }, 'Evaluating capability permission');

    // Rule 1: Tool definitions with requiresConfirmation = true or HIGH/CRITICAL risk levels require explicit confirmation
    if (tool.requiresConfirmation || tool.riskLevel === RiskLevel.HIGH || tool.riskLevel === RiskLevel.CRITICAL) {
      return {
        state: PermissionDecisionState.REQUIRE_CONFIRMATION,
        capability: tool.requiredCapability,
        reason: `Tool '${tool.name}' requires explicit confirmation due to ${tool.riskLevel} risk rating.`
      };
    }

    // Rule 2: Check if capability is registered in allowed set
    if (!this.allowedCapabilities.has(tool.requiredCapability)) {
      return {
        state: PermissionDecisionState.DENY,
        capability: tool.requiredCapability,
        reason: `Capability '${tool.requiredCapability}' is not granted in active session.`
      };
    }

    // Rule 3: SAFE, LOW, and MODERATE risk tools with valid capability are ALLOWED
    return {
      state: PermissionDecisionState.ALLOW,
      capability: tool.requiredCapability,
      reason: `Tool '${tool.name}' authorized under active session capability grant.`
    };
  }

  public grantCapability(capability: CapabilityPermission): void {
    this.allowedCapabilities.add(capability);
  }

  public revokeCapability(capability: CapabilityPermission): void {
    this.allowedCapabilities.delete(capability);
  }
}

export const permissionEngine = new PermissionEngine();
