import { z } from 'zod';
import { CapabilityPermission, RiskLevel, ToolDefinition } from '@jarvis/shared';

export const getCurrentTimeSchema = z.object({
  timezone: z.string().optional()
});

export const getCurrentTimeTool: ToolDefinition<typeof getCurrentTimeSchema> = {
  name: 'get_current_time',
  description: 'Returns the current local or UTC time in human readable format.',
  inputSchema: getCurrentTimeSchema,
  riskLevel: RiskLevel.SAFE,
  requiredCapability: CapabilityPermission.SYSTEM_TIME,
  requiresConfirmation: false,
  timeoutMs: 5000
};

export async function executeGetCurrentTime(input: z.infer<typeof getCurrentTimeSchema>): Promise<{ formattedTime: string; timestamp: number; timezone: string }> {
  const date = new Date();
  const tz = input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  let formattedTime: string;
  try {
    formattedTime = date.toLocaleTimeString('en-US', { timeZone: tz, hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  } catch {
    formattedTime = date.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }

  return {
    formattedTime,
    timestamp: date.getTime(),
    timezone: tz
  };
}
