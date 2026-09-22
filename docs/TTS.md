# Text-to-Speech (TTS) Subsystem

## Overview
The TTS subsystem converts assistant responses into speech audio via the `TTSProvider` interface, providing immediate barge-in cancellation and speech rate/pitch control.

## Interface Definition
```typescript
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
```

## Implemented Providers
1. **`WebSpeechTTSProvider`**: Uses browser `SpeechSynthesisUtterance`. Supports instant cancellation (`window.speechSynthesis.cancel()`) on user interruption or manual "Stop Speaking" trigger.
2. **`MockTTSProvider`**: Deterministic offline provider for unit testing.
