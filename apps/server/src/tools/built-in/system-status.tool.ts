import { z } from 'zod';
import { CapabilityPermission, RiskLevel, SystemStatusSnapshot, ToolDefinition, ToolExecutionContext } from '@jarvis/shared';
import { getHealthStatus } from '../../health/health.service.js';
import { executeSystemStatus } from './desktop.tools.js';

export const getSystemStatusSchema = z.object({});

export const getSystemStatusTool: ToolDefinition<typeof getSystemStatusSchema> = {
  name: 'get_system_status',
  description: 'Returns real-time system status indicators and desktop telemetry for host Windows machine.',
  inputSchema: getSystemStatusSchema,
  riskLevel: RiskLevel.SAFE,
  requiredCapability: CapabilityPermission.SYSTEM_READ,
  requiresConfirmation: false,
  timeoutMs: 10000
};

export async function executeGetSystemStatus(_input: {}, context: ToolExecutionContext): Promise<any> {
  const desktopRes = await executeSystemStatus({}, context);
  if (desktopRes && (desktopRes as any).message) {
    return desktopRes;
  }
  const health = getHealthStatus();
  const msg = `JARVIS Core Components: Core ${health.components.core}, Server ${health.components.server}, LLM ${health.components.llm}, Tools ${health.components.tools}`;
  return {
    components: health.components,
    uptimeSeconds: health.uptimeSeconds,
    message: msg
  };
}
