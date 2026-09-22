import { VoiceState } from '@jarvis/shared';

export type StateChangeListener = (newState: VoiceState, prevState: VoiceState) => void;

const VALID_TRANSITIONS: Record<VoiceState, VoiceState[]> = {
  [VoiceState.IDLE]: [VoiceState.LISTENING, VoiceState.ERROR],
  [VoiceState.LISTENING]: [VoiceState.TRANSCRIBING, VoiceState.IDLE, VoiceState.INTERRUPTED, VoiceState.ERROR],
  [VoiceState.TRANSCRIBING]: [VoiceState.THINKING, VoiceState.IDLE, VoiceState.ERROR],
  [VoiceState.THINKING]: [VoiceState.EXECUTING, VoiceState.SPEAKING, VoiceState.IDLE, VoiceState.ERROR],
  [VoiceState.EXECUTING]: [VoiceState.SPEAKING, VoiceState.IDLE, VoiceState.ERROR],
  [VoiceState.SPEAKING]: [VoiceState.IDLE, VoiceState.INTERRUPTED, VoiceState.LISTENING, VoiceState.ERROR],
  [VoiceState.INTERRUPTED]: [VoiceState.LISTENING, VoiceState.IDLE, VoiceState.ERROR],
  [VoiceState.ERROR]: [VoiceState.IDLE, VoiceState.LISTENING]
};

export class VoiceStateMachine {
  private currentState: VoiceState = VoiceState.IDLE;
  private listeners: Set<StateChangeListener> = new Set();

  public getCurrentState(): VoiceState {
    return this.currentState;
  }

  public transitionTo(newState: VoiceState): boolean {
    if (this.currentState === newState) return true;

    const allowedNextStates = VALID_TRANSITIONS[this.currentState];
    if (!allowedNextStates.includes(newState)) {
      console.warn(`[VoiceState] Invalid state transition: ${this.currentState} -> ${newState}`);
      return false;
    }

    const prev = this.currentState;
    this.currentState = newState;

    this.listeners.forEach((listener) => {
      try {
        listener(newState, prev);
      } catch (err) {
        console.error('[VoiceState] Listener error:', err);
      }
    });

    return true;
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public reset(): void {
    const prev = this.currentState;
    this.currentState = VoiceState.IDLE;
    this.listeners.forEach((listener) => listener(VoiceState.IDLE, prev));
  }
}

export const voiceStateMachine = new VoiceStateMachine();
