import { z } from 'zod';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { CapabilityPermission, RiskLevel, ToolDefinition, ToolExecutionContext } from '@jarvis/shared';
import { logger } from '../../logging/logger.js';

export const PlayYouTubeInputSchema = z.object({
  action: z.enum(['play', 'pause', 'resume', 'stop', 'next', 'previous', 'change', 'fullscreen', 'cinema']).optional().default('play'),
  query: z.string().optional().default('').describe('The song title, music genre, or video query to search and play on YouTube')
});

export type PlayYouTubeInput = z.infer<typeof PlayYouTubeInputSchema>;

export const playYouTubeTool: ToolDefinition<typeof PlayYouTubeInputSchema> = {
  name: 'play_youtube',
  description: 'Control YouTube & YouTube Music playback (play, pause, resume, stop, next track, change song) via Python OS automation.',
  inputSchema: PlayYouTubeInputSchema,
  riskLevel: RiskLevel.SAFE,
  requiredCapability: CapabilityPermission.MEDIA_PLAY,
  requiresConfirmation: false,
  timeoutMs: 10000
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '../../../scripts/play_youtube.py');

function cleanSongTitle(q: string): string {
  if (!q) return '';
  return q
    .replace(/^(play|search\s+for|search|listen\s+to|put\s+on)\s+/i, '')
    .replace(/\s+(from|on|in)\s+youtube.*$/i, '')
    .replace(/\s+youtube.*$/i, '')
    .replace(/\s+(from|on|in)$/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

export async function executePlayYouTube(
  input: PlayYouTubeInput,
  context: ToolExecutionContext
): Promise<{ success: boolean; action?: string; query?: string; url?: string; videoUrl?: string; message: string }> {
  const action = input.action || 'play';
  const rawQuery = input.query || '';
  const cleanTitle = cleanSongTitle(rawQuery) || rawQuery;

  logger.info({ sessionId: context.sessionId, action, query: cleanTitle }, 'Executing Python YouTube controller tool');

  return new Promise((resolve) => {
    const cmd = `python "${scriptPath}" "${action}" "${cleanTitle.replace(/"/g, '\\"')}"`;
    exec(cmd, (error, stdout, stderr) => {
      let result = {
        success: true,
        action,
        query: cleanTitle,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}`,
        videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle)}`,
        message: cleanTitle ? `Playing '${cleanTitle}' on YouTube.` : `Executed ${action} on YouTube media.`
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
        logger.warn({ error: error.message, stderr }, 'Python play_youtube script failed');
      }

      resolve(result);
    });
  });
}
