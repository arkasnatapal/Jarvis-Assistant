# Speech-to-Text (STT) Subsystem

## Overview
The STT subsystem abstracts voice transcription via the `STTProvider` interface, supporting browser-native Web Speech API with fallback mock providers for headless/test environments.

## Interface Definition
```typescript
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
```

## Implemented Providers
1. **`WebSpeechSTTProvider`**: Uses browser `SpeechRecognition` / `webkitSpeechRecognition`. Supports real-time partial and final transcriptions across English (`en-US`), Hindi (`hi-IN`), Bengali (`bn-IN`), Hinglish, and Banglish.
2. **`MockSTTProvider`**: Deterministic offline provider for unit testing.
