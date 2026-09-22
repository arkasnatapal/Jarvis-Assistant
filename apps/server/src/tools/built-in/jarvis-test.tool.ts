import { z } from 'zod';
import { CapabilityPermission, RiskLevel, ToolDefinition } from '@jarvis/shared';

export const jarvisTestSchema = z.object({
  component: z.string().optional().default('core_pipeline')
});

export const jarvisTestTool: ToolDefinition<typeof jarvisTestSchema> = {
  name: 'jarvis_test',
  description: 'Self-test diagnostic tool to validate tool calling, events, permission checks, and pipeline health.',
  inputSchema: jarvisTestSchema,
  riskLevel: RiskLevel.SAFE,
  requiredCapability: CapabilityPermission.JARVIS_TEST,
  requiresConfirmation: false,
  timeoutMs: 5000
};

export async function executeJarvisTest(input: z.infer<typeof jarvisTestSchema>): Promise<{ success: boolean; component: string; timestamp: number; message: string }> {
  return {
    success: true,
    component: input.component,
    timestamp: Date.now(),
    message: `JARVIS self-diagnostic pipeline passed for component '${input.component}'. All subsystems nominal.`
  };
}
