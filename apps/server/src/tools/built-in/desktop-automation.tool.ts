import { z } from 'zod';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { CapabilityPermission, RiskLevel, ToolDefinition, ToolExecutionContext } from '@jarvis/shared';
import { logger } from '../../logging/logger.js';

export const DesktopAutomationInputSchema = z.object({
  category: z.enum(['volume', 'media', 'app', 'system', 'folder', 'browser']).describe('Category of desktop automation'),
  action: z.string().describe('Specific action to execute within category (e.g. mute, up, down, open, close, lock, organize_downloads, take_note, google_search)'),
  query: z.string().optional().default('').describe('Optional query or target parameter (app name, folder name, search query, note text)')
});

export type DesktopAutomationInput = z.infer<typeof DesktopAutomationInputSchema>;

export const desktopAutomationTool: ToolDefinition<typeof DesktopAutomationInputSchema> = {
  name: 'desktop_automation',
  description: 'Execute native Windows desktop automations deterministically via Python (volume, apps, YouTube/media, system lock, folder organizing, dictation notes, web search).',
  inputSchema: DesktopAutomationInputSchema,
  riskLevel: RiskLevel.SAFE,
  requiredCapability: CapabilityPermission.SYSTEM_READ,
  requiresConfirmation: false,
  timeoutMs: 10000
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '../../../scripts/desktop_automation.py');

export async function executeDesktopAutomation(
  input: DesktopAutomationInput,
  context: ToolExecutionContext
): Promise<{ success: boolean; action?: string; message: string; [key: string]: any }> {
  const { category, action, query = '' } = input;

  logger.info({ sessionId: context.sessionId, category, action, query }, 'Executing Python Desktop Automation tool');

  return new Promise((resolve) => {
    const safeQuery = query.replace(/"/g, '\\"');
    const cmd = `python "${scriptPath}" "${category}" "${action}" "${safeQuery}"`;

    exec(cmd, (error, stdout, stderr) => {
      let result = {
        success: true,
        category,
        action,
        query,
        message: `Executed desktop action '${action}' in category '${category}'.`
      };

      if (!error && stdout) {
        try {
          const parsed = JSON.parse(stdout.trim());
          result = {
            ...result,
            ...parsed,
            message: parsed.message || result.message
          };
        } catch {
          // Keep default result
        }
      } else if (error) {
        logger.warn({ error: error.message, stderr }, 'Python desktop_automation script failed');
        result.success = false;
        result.message = `Failed to execute desktop action: ${error.message}`;
      }

      resolve(result);
    });
  });
}
