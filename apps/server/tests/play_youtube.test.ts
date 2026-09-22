import { describe, it, expect } from 'vitest';
import { executePlayYouTube, playYouTubeTool } from '../src/tools/built-in/play-youtube.tool.js';
import { CapabilityPermission, RiskLevel } from '@jarvis/shared';

describe('Play YouTube Tool Suite', () => {
  it('defines correct play_youtube metadata', () => {
    expect(playYouTubeTool.name).toBe('play_youtube');
    expect(playYouTubeTool.riskLevel).toBe(RiskLevel.SAFE);
    expect(playYouTubeTool.requiredCapability).toBe(CapabilityPermission.MEDIA_PLAY);
  });

  it('executes play_youtube tool and builds search URL', async () => {
    const res = await executePlayYouTube(
      { query: 'Lofi beats' },
      { sessionId: 'test_yt_sess', correlationId: 'corr_yt' }
    );

    expect(res.success).toBe(true);
    expect(res.query).toBe('Lofi beats');
    expect(res.url).toContain('youtube.com');
  });
});
