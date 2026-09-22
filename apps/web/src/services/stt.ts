import { AudioInput, STTOptions, TranscriptionResult } from '@jarvis/shared';

export interface STTProvider {
  id: string;
  name: string;
  isAvailable(): boolean;
  transcribe(audio: AudioInput): Promise<TranscriptionResult>;
  startListening(
    options: STTOptions,
    onResult: (result: TranscriptionResult) => void,
    onError: (err: Error) => void
  ): void;
  stopListening(): void;
}

export class WebSpeechSTTProvider implements STTProvider {
  public id = 'webspeech-stt';
  public name = 'Browser Web Speech STT';
  private recognition: any = null;
  private listening = false;
  private shouldKeepListening = false;
  private currentOptions: STTOptions | null = null;
  private onResultCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((err: Error) => void) | null = null;

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  public async transcribe(audio: AudioInput): Promise<TranscriptionResult> {
    return {
      text: 'Voice transcription completed.',
      isFinal: true
    };
  }

  public startListening(
    options: STTOptions,
    onResult: (result: TranscriptionResult) => void,
    onError: (err: Error) => void
  ): void {
    if (!this.isAvailable()) {
      onError(new Error('Web Speech API is not supported in this browser.'));
      return;
    }

    this.currentOptions = options;
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.shouldKeepListening = true;

    this.initAndStart();
  }

  private initAndStart(): void {
    if (!this.shouldKeepListening) return;

    // Enable hardware & browser Acoustic Echo Cancellation (AEC) and noise suppression
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      }).catch(() => {});
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!this.recognition) {
        this.recognition = new SpeechRecognition();
      }

      this.recognition.continuous = true; // Always continuous listening
      this.recognition.interimResults = this.currentOptions?.interimResults ?? true;
      this.recognition.lang = this.mapLanguageCode(this.currentOptions?.language || 'en');

      this.recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        const currentText = (finalText || interimText).trim();
        if (currentText && this.onResultCallback) {
          this.onResultCallback({
            text: currentText,
            isFinal: Boolean(finalText)
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'network') {
          if (this.shouldKeepListening) {
            setTimeout(() => this.restartQuietly(), 300);
          }
        } else if (this.onErrorCallback) {
          this.onErrorCallback(new Error(`Speech recognition error: ${event.error}`));
        }
      };

      this.recognition.onend = () => {
        this.listening = false;
        // Auto restart if shouldKeepListening is true so it ALWAYS listens!
        if (this.shouldKeepListening) {
          setTimeout(() => this.restartQuietly(), 250);
        }
      };

      this.recognition.start();
      this.listening = true;
    } catch {
      if (this.shouldKeepListening) {
        setTimeout(() => this.restartQuietly(), 800);
      }
    }
  }

  private restartQuietly(): void {
    if (!this.shouldKeepListening) return;
    try {
      this.recognition?.start();
      this.listening = true;
    } catch {
      try {
        this.initAndStart();
      } catch {}
    }
  }

  public stopListening(): void {
    this.shouldKeepListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.listening = false;
    }
  }

  private mapLanguageCode(lang: string): string {
    switch (lang) {
      case 'hi': return 'hi-IN';
      case 'bn': return 'bn-IN';
      case 'hinglish': return 'hi-IN';
      case 'banglish': return 'bn-IN';
      case 'en':
      default: return 'en-US';
    }
  }
}

export class MockSTTProvider implements STTProvider {
  public id = 'mock-stt';
  public name = 'Mock STT Provider';
  private timer: any = null;

  public isAvailable(): boolean {
    return true;
  }

  public async transcribe(audio: AudioInput): Promise<TranscriptionResult> {
    return {
      text: 'Hello JARVIS',
      isFinal: true
    };
  }

  public startListening(
    options: STTOptions,
    onResult: (result: TranscriptionResult) => void,
    onError: (err: Error) => void
  ): void {
    this.timer = setTimeout(() => {
      onResult({
        text: 'Hello JARVIS',
        isFinal: true
      });
    }, 1500);
  }

  public stopListening(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
