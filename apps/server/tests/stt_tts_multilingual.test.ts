import { describe, it, expect } from 'vitest';
import { LanguageDetector, defaultPersonalityConfig, buildJarvisSystemPrompt } from '@jarvis/shared';

describe('Multilingual & Personality Suite', () => {
  it('detects English input accurately', () => {
    const meta = LanguageDetector.detectLanguage('What is the weather today?');
    expect(meta.language).toBe('en');
    expect(meta.confidence).toBeGreaterThan(0.9);
  });

  it('detects Hindi Devanagari script accurately', () => {
    const meta = LanguageDetector.detectLanguage('नमस्ते जाार्विस, आज का मौसम कैसा है?');
    expect(meta.language).toBe('hi');
  });

  it('detects Bengali script accurately', () => {
    const meta = LanguageDetector.detectLanguage('জার্ভিস, আজ আমার কী কাজ আছে?');
    expect(meta.language).toBe('bn');
  });

  it('detects Hinglish keywords accurately', () => {
    const meta = LanguageDetector.detectLanguage('Jarvis, aaj mera schedule kya hai?');
    expect(meta.language).toBe('hinglish');
  });

  it('detects Banglish keywords accurately', () => {
    const meta = LanguageDetector.detectLanguage('Jarvis, aaj amar kaaj ache?');
    expect(meta.language).toBe('banglish');
  });

  it('generates centralized JARVIS personality system prompt correctly', () => {
    const prompt = buildJarvisSystemPrompt(defaultPersonalityConfig);
    expect(prompt).toContain('You are JARVIS');
    expect(prompt).toContain('Tone: calm');
    expect(prompt).toContain('NEITHER claim nor pretend that an action or tool execution was completed unless the tool actually executed successfully');
  });
});
