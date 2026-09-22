import { describe, it, expect } from 'vitest';
import { VoiceState } from '@jarvis/shared';

// Test Voice State Transition Logic
class TestVoiceStateMachine {
  private currentState: VoiceState = VoiceState.IDLE;
  private validTransitions: Record<VoiceState, VoiceState[]> = {
    [VoiceState.IDLE]: [VoiceState.LISTENING, VoiceState.ERROR],
    [VoiceState.LISTENING]: [VoiceState.TRANSCRIBING, VoiceState.IDLE, VoiceState.INTERRUPTED, VoiceState.ERROR],
    [VoiceState.TRANSCRIBING]: [VoiceState.THINKING, VoiceState.IDLE, VoiceState.ERROR],
    [VoiceState.THINKING]: [VoiceState.EXECUTING, VoiceState.SPEAKING, VoiceState.IDLE, VoiceState.ERROR],
    [VoiceState.EXECUTING]: [VoiceState.SPEAKING, VoiceState.IDLE, VoiceState.ERROR],
    [VoiceState.SPEAKING]: [VoiceState.IDLE, VoiceState.INTERRUPTED, VoiceState.LISTENING, VoiceState.ERROR],
    [VoiceState.INTERRUPTED]: [VoiceState.LISTENING, VoiceState.IDLE, VoiceState.ERROR],
    [VoiceState.ERROR]: [VoiceState.IDLE, VoiceState.LISTENING]
  };

  public getState(): VoiceState {
    return this.currentState;
  }

  public transitionTo(next: VoiceState): boolean {
    if (this.currentState === next) return true;
    if (!this.validTransitions[this.currentState].includes(next)) return false;
    this.currentState = next;
    return true;
  }
}

describe('Voice State Machine Suite', () => {
  it('follows valid voice state transitions', () => {
    const sm = new TestVoiceStateMachine();
    expect(sm.getState()).toBe(VoiceState.IDLE);

    expect(sm.transitionTo(VoiceState.LISTENING)).toBe(true);
    expect(sm.getState()).toBe(VoiceState.LISTENING);

    expect(sm.transitionTo(VoiceState.TRANSCRIBING)).toBe(true);
    expect(sm.getState()).toBe(VoiceState.TRANSCRIBING);

    expect(sm.transitionTo(VoiceState.THINKING)).toBe(true);
    expect(sm.getState()).toBe(VoiceState.THINKING);

    expect(sm.transitionTo(VoiceState.SPEAKING)).toBe(true);
    expect(sm.getState()).toBe(VoiceState.SPEAKING);

    expect(sm.transitionTo(VoiceState.IDLE)).toBe(true);
    expect(sm.getState()).toBe(VoiceState.IDLE);
  });

  it('handles barge-in interruption correctly', () => {
    const sm = new TestVoiceStateMachine();
    sm.transitionTo(VoiceState.LISTENING);
    sm.transitionTo(VoiceState.TRANSCRIBING);
    sm.transitionTo(VoiceState.THINKING);
    sm.transitionTo(VoiceState.SPEAKING);

    expect(sm.transitionTo(VoiceState.INTERRUPTED)).toBe(true);
    expect(sm.getState()).toBe(VoiceState.INTERRUPTED);

    expect(sm.transitionTo(VoiceState.LISTENING)).toBe(true);
    expect(sm.getState()).toBe(VoiceState.LISTENING);
  });

  it('rejects invalid state transitions', () => {
    const sm = new TestVoiceStateMachine();
    // IDLE -> SPEAKING is invalid without LISTENING/THINKING
    expect(sm.transitionTo(VoiceState.SPEAKING)).toBe(false);
    expect(sm.getState()).toBe(VoiceState.IDLE);
  });
});
