# JARVIS Voice Subsystem Architecture

## Overview
Phase 2 transforms JARVIS from a text-only assistant into a natural, interruptible, real-time voice assistant.

## Voice State Machine
The voice subsystem is governed by an explicit `VoiceStateMachine` with the following states:

- **`IDLE`**: Default ready state.
- **`LISTENING`**: Microphone active, collecting voice input.
- **`TRANSCRIBING`**: Converting captured speech to text.
- **`THINKING`**: Orchestrator evaluating prompt & routing to LLM/Tools.
- **`EXECUTING`**: Tool execution phase (if required by intent).
- **`SPEAKING`**: Synthesizing & playing assistant response audio.
- **`INTERRUPTED`**: User barge-in detected; immediately halts audio output.
- **`ERROR`**: Exception/permission failure state.

## State Transition Diagram
```
IDLE -> LISTENING -> TRANSCRIBING -> THINKING -> [EXECUTING] -> SPEAKING -> IDLE
                                                    ^             |
                                                    +---(Barge)--+
```

## Typed Voice Events
- `voice.session.started` / `voice.session.ended`
- `voice.listening.started` / `voice.listening.stopped`
- `voice.audio.received`
- `voice.transcription.started` / `voice.transcription.partial` / `voice.transcription.completed`
- `voice.language.detected`
- `voice.processing.started`
- `voice.speaking.started` / `voice.speaking.stopped`
- `voice.interrupted`
- `voice.error`
