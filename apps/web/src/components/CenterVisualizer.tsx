import React from 'react';
import { Camera, Mic, MicOff, Keyboard, Square, Globe } from 'lucide-react';
import { VoiceState, SupportedLanguage } from '@jarvis/shared';

interface CenterVisualizerProps {
  voiceState: VoiceState;
  detectedLanguage?: SupportedLanguage;
  liveTranscription?: string;
  isContinuousMode: boolean;
  onToggleMic: () => void;
  onStopSpeaking: () => void;
  onToggleContinuous: () => void;
  onFocusInput: () => void;
}

export const CenterVisualizer: React.FC<CenterVisualizerProps> = ({
  voiceState,
  detectedLanguage = 'en',
  liveTranscription = '',
  isContinuousMode,
  onToggleMic,
  onStopSpeaking,
  onToggleContinuous,
  onFocusInput
}) => {
  const isListening = voiceState === VoiceState.LISTENING;
  const isThinking = voiceState === VoiceState.THINKING || voiceState === VoiceState.TRANSCRIBING;
  const isSpeaking = voiceState === VoiceState.SPEAKING;

  const getStatusText = () => {
    switch (voiceState) {
      case VoiceState.LISTENING:
        return 'Listening for voice input...';
      case VoiceState.TRANSCRIBING:
        return 'Transcribing audio...';
      case VoiceState.THINKING:
        return 'Cognitive processing...';
      case VoiceState.EXECUTING:
        return 'Executing requested tool...';
      case VoiceState.SPEAKING:
        return 'JARVIS Speaking...';
      case VoiceState.INTERRUPTED:
        return 'Speech interrupted.';
      case VoiceState.ERROR:
        return 'Voice system error';
      case VoiceState.IDLE:
      default:
        return 'System Active & Ready';
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-between p-6 relative min-h-[480px] lg:min-h-0">
      {/* Top Language Badge & Voice State Overlay */}
      <div className="w-full flex items-center justify-between z-10 font-mono text-xs">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300">
          <Globe className="w-3.5 h-3.5" />
          <span className="uppercase">LANG: {detectedLanguage}</span>
        </div>

        <button
          onClick={onToggleContinuous}
          className={`px-3 py-1 rounded-full border transition-all text-xs ${
            isContinuousMode
              ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
              : 'bg-slate-900/80 border-slate-700 text-slate-400'
          }`}
        >
          {isContinuousMode ? 'Mode: Continuous' : 'Mode: Push-to-Talk'}
        </button>
      </div>

      {/* Arc Reactor Core Ring Visualizer */}
      <div className="my-auto flex flex-col items-center justify-center relative">
        {/* Outer Ring 3 */}
        <div className={`w-64 h-64 sm:w-72 sm:h-72 rounded-full border flex items-center justify-center relative transition-all duration-500 ${
          isListening ? 'border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-spin-slow' :
          isSpeaking ? 'border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-spin-slow' :
          'border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.1)] animate-spin-slow'
        }`}>
          {/* Outer Ring 2 */}
          <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-cyan-500/30 border-dashed flex items-center justify-center animate-pulse-ring">
            {/* Inner Ring 1 */}
            <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full border-2 border-cyan-400/50 flex items-center justify-center bg-cyan-950/20 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
              {/* Center Audio Wave Core */}
              <div className="w-24 h-24 rounded-full bg-cyan-950/80 border border-cyan-400 flex items-center justify-center gap-1 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                <span className={`w-1 rounded-full ${isListening ? 'bg-amber-400 animate-wave-1' : isSpeaking ? 'bg-emerald-400 animate-wave-1' : 'bg-cyan-400 animate-wave-1'}`}></span>
                <span className={`w-1 rounded-full ${isListening ? 'bg-amber-400 animate-wave-2' : isSpeaking ? 'bg-emerald-400 animate-wave-2' : 'bg-cyan-400 animate-wave-2'}`}></span>
                <span className={`w-1 rounded-full ${isListening ? 'bg-amber-400 animate-wave-3' : isSpeaking ? 'bg-emerald-400 animate-wave-3' : 'bg-cyan-400 animate-wave-3'}`}></span>
                <span className={`w-1 rounded-full ${isListening ? 'bg-amber-400 animate-wave-4' : isSpeaking ? 'bg-emerald-400 animate-wave-4' : 'bg-cyan-400 animate-wave-4'}`}></span>
                <span className={`w-1 rounded-full ${isListening ? 'bg-amber-400 animate-wave-5' : isSpeaking ? 'bg-emerald-400 animate-wave-5' : 'bg-cyan-400 animate-wave-5'}`}></span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Label & Status */}
        <div className="mt-6 text-center space-y-2">
          <h2 className="text-2xl font-black tracking-[0.4em] text-cyan-300 font-mono cyan-glow-text">
            J.A.R.V.I.S
          </h2>
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${
              isListening ? 'bg-amber-400 animate-ping' :
              isThinking ? 'bg-cyan-400 animate-ping' :
              isSpeaking ? 'bg-emerald-400 animate-pulse' :
              'bg-emerald-400'
            }`}></span>
            <span className="text-cyan-300">
              {getStatusText()}
            </span>
          </div>

          {/* Live Transcription Banner */}
          {liveTranscription && (
            <div className="mt-2 max-w-sm px-4 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-200 truncate shadow-inner">
              "{liveTranscription}"
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Control Toolbar */}
      <div className="flex items-center space-x-3 mb-2 z-10">
        <button
          className="w-11 h-11 rounded-xl bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all shadow-lg"
          title="Toggle Camera"
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Microphone Button */}
        <button
          onClick={onToggleMic}
          className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] ${
            isListening
              ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
              : 'bg-slate-900/90 border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/60'
          }`}
          title={isListening ? 'Stop Listening' : 'Start Listening'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Stop Speaking Button */}
        {isSpeaking && (
          <button
            onClick={onStopSpeaking}
            className="w-11 h-11 rounded-xl bg-rose-950/80 border border-rose-500/50 hover:bg-rose-900 text-rose-300 flex items-center justify-center transition-all shadow-lg animate-pulse"
            title="Stop Speaking (Barge-in)"
          >
            <Square className="w-4 h-4 fill-rose-300" />
          </button>
        )}

        <button
          onClick={onFocusInput}
          className="w-11 h-11 rounded-xl bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all shadow-lg"
          title="Focus Message Input"
        >
          <Keyboard className="w-5 h-5" />
        </button>
      </div>
    </main>
  );
};
