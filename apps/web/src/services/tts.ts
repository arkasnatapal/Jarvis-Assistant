import { AudioOutput, TTSOptions } from '@jarvis/shared';

export interface TTSProvider {
  id: string;
  name: string;
  isAvailable(): boolean;
  synthesize(text: string, options?: TTSOptions): Promise<AudioOutput>;
  speak(
    text: string,
    options?: TTSOptions,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ): void;
  stop(): void;
}

export class WebSpeechTTSProvider implements TTSProvider {
  public id = 'webspeech-tts';
  public name = 'Browser Web Speech TTS';

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public async synthesize(text: string, options?: TTSOptions): Promise<AudioOutput> {
    return {
      mimeType: 'audio/speech-synthesis'
    };
  }

  public speak(
    text: string,
    options?: TTSOptions,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ): void {
    if (!this.isAvailable()) {
      onError?.(new Error('Speech Synthesis API is not supported in this browser.'));
      return;
    }

    this.stop(); // Stop any currently playing audio

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.speed ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;

    if (options?.language) {
      utterance.lang = this.mapLanguageCode(options.language);
    }

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      onEnd?.();
    };

    utterance.onerror = (event: any) => {
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        onError?.(new Error(`Speech Synthesis Error: ${event.error}`));
      } else {
        onEnd?.();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  public stop(): void {
    if (this.isAvailable()) {
      window.speechSynthesis.cancel();
    }
  }

  private mapLanguageCode(lang: string): string {
    switch (lang) {
      case 'hi':
        return 'hi-IN';
      case 'bn':
        return 'bn-IN';
      case 'hinglish':
        return 'hi-IN';
      case 'banglish':
        return 'bn-IN';
      case 'en':
      default:
        return 'en-US';
    }
  }
}

export class MockTTSProvider implements TTSProvider {
  public id = 'mock-tts';
  public name = 'Mock TTS Provider';
  private timer: any = null;

  public isAvailable(): boolean {
    return true;
  }

  public async synthesize(text: string, options?: TTSOptions): Promise<AudioOutput> {
    return {};
  }

  public speak(
    text: string,
    options?: TTSOptions,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: Error) => void
  ): void {
    onStart?.();
    const duration = Math.min(Math.max(text.length * 50, 1000), 5000);
    this.timer = setTimeout(() => {
      onEnd?.();
    }, duration);
  }

  public stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
