import { LanguageMetadata, SupportedLanguage } from '../types/index.js';

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const BENGALI_REGEX = /[\u0980-\u09FF]/;

const HINGLISH_KEYWORDS = ['aaj', 'mera', 'kaise', 'kya', 'hai', 'kaam', 'batao', 'kar', 'sakte', 'ho', 'nahin', 'huye', 'apna'];
const BANGLISH_KEYWORDS = ['aamhar', 'amar', 'kaaj', 'ache', 'kemon', 'kore', 'bhalo', 'korcho', 'aajke', 'bhaalo', 'apni'];

export class LanguageDetector {
  public static detectLanguage(text: string): LanguageMetadata {
    if (!text || text.trim().length === 0) {
      return { language: 'en', confidence: 1.0 };
    }

    const trimmed = text.trim();

    // Check Unicode scripts
    if (DEVANAGARI_REGEX.test(trimmed)) {
      return { language: 'hi', confidence: 0.95 };
    }

    if (BENGALI_REGEX.test(trimmed)) {
      return { language: 'bn', confidence: 0.95 };
    }

    // Check Latin script transliterated languages (Hinglish / Banglish)
    const words = trimmed.toLowerCase().split(/\s+/);
    let hinglishCount = 0;
    let banglishCount = 0;

    for (const word of words) {
      if (HINGLISH_KEYWORDS.includes(word)) hinglishCount++;
      if (BANGLISH_KEYWORDS.includes(word)) banglishCount++;
    }

    if (hinglishCount > 0 && hinglishCount >= banglishCount) {
      return { language: 'hinglish', confidence: 0.85 };
    }

    if (banglishCount > 0 && banglishCount > hinglishCount) {
      return { language: 'banglish', confidence: 0.85 };
    }

    return { language: 'en', confidence: 0.98 };
  }

  public static getLanguagePromptInstruction(lang: SupportedLanguage): string {
    switch (lang) {
      case 'hi':
        return 'The user spoke in Hindi (हिन्दी). Respond in Hindi script or natural polite Hindi.';
      case 'bn':
        return 'The user spoke in Bengali (বাংলা). Respond in Bengali script or natural polite Bengali.';
      case 'hinglish':
        return 'The user spoke in Hinglish. Respond naturally in Hinglish (Hindi written in Latin script).';
      case 'banglish':
        return 'The user spoke in Banglish. Respond naturally in Banglish (Bengali written in Latin script).';
      case 'en':
      default:
        return 'Respond in English.';
    }
  }
}
