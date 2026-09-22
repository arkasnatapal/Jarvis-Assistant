import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import {
  Clock, Mic, MicOff, Send, CloudSun, Bot, X, Terminal, VolumeX,
  Sparkles, ChevronRight, Copy, Check, Wrench, Globe, Cpu, User
} from 'lucide-react';
import { OrbVisualizer } from './OrbVisualizer.js';
import { RightChatPanel } from './RightChatPanel.js';
import { LeftSidebar } from './LeftSidebar.js';
import { ConfirmationModal } from './ConfirmationModal.js';
import { DisplayMessage } from '../types.js';
import { VoiceState, SupportedLanguage, LocalAgentInfo, ConfirmationRequest, JarvisEvent } from '@jarvis/shared';
import { WeatherData } from '../services/weather.js';
import { motion, AnimatePresence } from 'framer-motion';

interface JarvisLuxuryUIProps {
  isConnected: boolean;
  weather?: WeatherData;
  voiceState: VoiceState;
  detectedLanguage?: SupportedLanguage;
  liveTranscription?: string;
  messages: DisplayMessage[];
  isProcessing: boolean;
  agentInfo?: LocalAgentInfo;
  pendingConfirmation: ConfirmationRequest | null;
  events: JarvisEvent[];
  onSendMessage: (text: string) => void;
  onToggleMic: () => void;
  onStopSpeaking: () => void;
  onConfirmAction: (approved: boolean) => void;
  onClearHistory: () => void;
  onWeatherUpdate: (weather: WeatherData) => void;
}

export const JarvisLuxuryUI: React.FC<JarvisLuxuryUIProps> = ({
  isConnected,
  weather,
  voiceState,
  liveTranscription = '',
  messages,
  isProcessing,
  pendingConfirmation,
  events,
  onSendMessage,
  onToggleMic,
  onStopSpeaking,
  onConfirmAction,
  onClearHistory,
  onWeatherUpdate
}) => {
  const [inputText, setInputText] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLayerDismissed, setIsLayerDismissed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'telemetry'>('chat');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-unhide dynamic text whenever a new prompt or assistant response arrives
  useEffect(() => {
    if (messages.length > 0 || isProcessing || liveTranscription) {
      setIsLayerDismissed(false);
    }
  }, [messages.length, isProcessing, liveTranscription]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSend = () => {
    if (!inputText.trim() || isProcessing) return;
    setIsLayerDismissed(false);
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isListening = voiceState === VoiceState.LISTENING;
  const isSpeaking = voiceState === VoiceState.SPEAKING;

  // Filter messages for clean display
  const userMessages = messages.filter((m) => m.sender === 'user');
  const assistantMessages = messages.filter((m) => m.sender === 'assistant' && m.id !== 'msg_welcome');
  const latestUserMessage = userMessages[userMessages.length - 1];
  const latestAssistantMessage = assistantMessages[assistantMessages.length - 1];

  const hasActiveContent = (latestUserMessage !== undefined || latestAssistantMessage !== undefined || isProcessing || liveTranscription.length > 0);
  const showDynamicStage = hasActiveContent && !isLayerDismissed;

  return (
    <div className="relative h-screen w-screen luxury-ambient-bg text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Background Lighting & Soft Ambient Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full bg-amber-600/10 blur-[130px]" />
        <div className="absolute -top-32 -right-32 w-[650px] h-[650px] rounded-full bg-cyan-600/10 blur-[140px]" />
        <div className="absolute right-[22%] top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-slate-700/15 to-transparent" />
        <div className="absolute left-[20%] top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-amber-700/10 to-transparent" />
      </div>

      {/* Confirmation Modal */}
      {pendingConfirmation && (
        <ConfirmationModal
          request={pendingConfirmation}
          onConfirm={onConfirmAction}
        />
      )}

      {/* TOP HEADER BAR */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6">
        {/* Top Left Title */}
        <div className="flex flex-col">
          <h1 className="text-2xl lg:text-3xl font-cinzel font-light tracking-[0.38em] text-slate-100 uppercase">
            J A R V I S
          </h1>
          <span className="text-[9px] tracking-[0.3em] font-sans font-light text-slate-400 uppercase mt-0.5">
            YOUR PERSONAL AI ASSISTANT
          </span>
        </div>

        {/* Top Right Floating Status Capsule */}
        <div className="glass-header-pill px-4 py-1.5 rounded-full flex items-center space-x-3 text-xs font-sans font-light text-slate-300">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'}`} />
            <span className="text-slate-200 text-xs font-light">{isConnected ? 'Online' : 'Offline'}</span>
          </div>

          <span className="text-slate-600 font-extralight">|</span>

          {isListening ? (
            <div className="flex items-center space-x-1.5 text-amber-300 font-mono text-[11px] animate-pulse">
              <Mic className="w-3 h-3 text-amber-400" />
              <span>Mic Active • Say "Jarvis"</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[11px]">
              <MicOff className="w-3 h-3 text-slate-500" />
              <span>Mic Muted</span>
            </div>
          )}

          <span className="text-slate-600 font-extralight">|</span>

          <span className="text-slate-400 text-xs font-light">{dateStr || 'Mon, 16 Dec 2024'}</span>

          <span className="text-slate-400 text-xs font-light">{timeStr || '07:24 PM'}</span>

          {/* Profile / Drawer Toggle Button */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="w-7 h-7 ml-1 rounded-full bg-slate-800/80 border border-slate-600/50 flex items-center justify-center text-xs font-serif text-slate-200 hover:border-cyan-400 hover:text-cyan-300 transition-all cursor-pointer"
            title="Toggle Console & History Drawer"
          >
            A
          </button>
        </div>
      </header>

      {/* MAIN CENTER DASHBOARD STAGE */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 items-center px-8 max-w-7xl mx-auto w-full gap-6 my-auto">
        
        {/* LEFT OVERLAY TEXT */}
        <div className={`hidden lg:flex ${showDynamicStage ? 'lg:col-span-2' : 'lg:col-span-3'} items-center space-x-4 transition-all duration-500`}>
          <div className="w-[2px] h-14 bg-amber-400/40 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.3)]" />
          <div className="text-xs font-sans tracking-[0.24em] font-light text-slate-400 leading-relaxed uppercase">
            <div>A SMARTER</div>
            <div>TOMORROW.</div>
            <div>TOGETHER.</div>
          </div>
        </div>

        {/* CENTER ANIMATED ORB (SLIDES SMOOTHLY TO LEFT WHEN RESPONSES ARRIVE) */}
        <motion.div
          layout
          transition={{ type: 'spring', damping: 26, stiffness: 170 }}
          className={`col-span-1 ${showDynamicStage ? 'lg:col-span-5' : 'lg:col-span-6'} flex flex-col items-center justify-center relative my-auto`}
        >
          {/* 3D Animated Orb Visualizer */}
          <OrbVisualizer voiceState={voiceState} size={showDynamicStage ? 360 : 440} />
          
          {/* Table Ambient Light Reflection */}
          <div className="w-64 h-8 rounded-[100%] bg-cyan-400/10 blur-xl -mt-6 pointer-events-none" />

          {/* Live Voice Transcription Pill */}
          {liveTranscription && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 px-5 py-2 rounded-full glass-header-pill text-xs font-sans text-cyan-200 shadow-xl max-w-md text-center border border-cyan-500/30 animate-pulse"
            >
              "{liveTranscription}"
            </motion.div>
          )}
        </motion.div>

        {/* RIGHT SIDE: PURE FRAMELESS GLASS DYNAMIC RESPONSE LAYER */}
        <div className={`col-span-1 ${showDynamicStage ? 'lg:col-span-5' : 'lg:col-span-3'} flex flex-col justify-center items-start pl-0 lg:pl-6 w-full h-full relative z-20`}>
          <AnimatePresence mode="wait">
            {showDynamicStage ? (
              /* PURE FRAMELESS GLASS TYPOGRAPHY RESPONSE DISPLAY */
              <motion.div
                key="frameless-glass-response"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full space-y-6 flex flex-col justify-center max-h-[65vh] overflow-y-auto pr-2"
              >
                {/* User Question */}
                {latestUserMessage && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-sans tracking-[0.25em] text-amber-300/80 font-light uppercase flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                      <span>YOU ASKED</span>
                    </div>
                    <div className="text-lg lg:text-xl font-sans font-light text-slate-100 leading-snug tracking-wide">
                      "{latestUserMessage.text}"
                    </div>
                  </div>
                )}

                {/* JARVIS Response */}
                {latestAssistantMessage ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-sans tracking-[0.3em] text-cyan-400 font-light uppercase flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>JARVIS</span>
                      {latestAssistantMessage.toolExecuted && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          • {typeof latestAssistantMessage.toolExecuted === 'string' ? latestAssistantMessage.toolExecuted : latestAssistantMessage.toolExecuted.toolName}
                        </span>
                      )}
                    </div>
                    <div className="text-2xl lg:text-3xl font-serif-luxury font-light text-slate-100 leading-relaxed tracking-wide luxury-text-glow whitespace-pre-wrap">
                      {latestAssistantMessage.text}
                    </div>
                  </div>
                ) : isProcessing ? (
                  <div className="flex items-center space-x-3 text-xs font-sans tracking-[0.3em] text-cyan-300 font-light uppercase animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#38bdf8]" />
                    <span>JARVIS IS THINKING...</span>
                  </div>
                ) : null}

                {/* Floating Dismiss Action */}
                <div className="pt-2 flex items-center space-x-4 text-[11px] font-sans tracking-widest text-slate-400">
                  <button
                    onClick={() => setIsLayerDismissed(true)}
                    className="hover:text-slate-100 transition-all font-light uppercase flex items-center gap-1.5 cursor-pointer opacity-60 hover:opacity-100"
                    title="Dismiss text view"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>DISMISS</span>
                  </button>
                </div>
                <div ref={scrollRef} />
              </motion.div>
            ) : (
              /* CLEAN LUXURY STATIC HERO TYPOGRAPHY */
              <motion.div
                key="static-brand-hero"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="hidden lg:flex flex-col justify-center items-start"
              >
                <h2 className="text-5xl lg:text-6xl font-serif-luxury font-light text-slate-100 tracking-wide leading-none luxury-text-glow">
                  Hello,
                </h2>
                <h2 className="text-5xl lg:text-6xl font-serif-luxury font-normal text-slate-100 tracking-wide mt-2 leading-none luxury-text-glow">
                  I'm JARVIS.
                </h2>

                <div className="text-[11px] font-sans tracking-[0.35em] text-slate-400/90 font-light mt-6 uppercase">
                  LISTEN · THINK · ASSIST · EVOLVE
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* BOTTOM FLOATING INPUT BAR & CORNER WIDGETS */}
      <footer className="relative z-20 px-8 pb-8 flex flex-col items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 items-end">
          {/* Bottom Left Weather Widget */}
          <div className="hidden lg:flex lg:col-span-3 flex-col text-xs font-sans font-light text-slate-400 space-y-0.5">
            <div className="text-slate-400">
              {weather?.city ? `${weather.city}${weather.country ? `, ${weather.country}` : ''}` : 'Kolkata, IN'}
            </div>
            <div className="flex items-center space-x-2 text-slate-200 text-lg font-serif">
              <span>{weather?.temp !== undefined ? `${Math.round(weather.temp)}°C` : '22°C'}</span>
              <CloudSun className="w-4 h-4 text-slate-400 ml-1" />
            </div>
            <div className="text-[11px] text-slate-500 capitalize">{weather?.description ?? 'Haze'}</div>
          </div>

          {/* Center Floating Glass Input Pill */}
          <div className="col-span-1 lg:col-span-6 flex justify-center">
            <div className="glass-input-pill rounded-full p-2 px-5 flex items-center space-x-3 w-full max-w-xl transition-all">
              {/* Equalizer lines */}
              <div className="flex items-center gap-1 px-1">
                <span className={`w-0.5 rounded-full transition-all ${isListening ? 'bg-amber-400 h-5 animate-pulse' : isSpeaking ? 'bg-cyan-400 h-5 animate-pulse' : 'bg-slate-500 h-3'}`} />
                <span className={`w-0.5 rounded-full transition-all ${isListening ? 'bg-amber-400 h-4 animate-pulse' : isSpeaking ? 'bg-cyan-400 h-4 animate-pulse' : 'bg-slate-500 h-4'}`} />
                <span className={`w-0.5 rounded-full transition-all ${isListening ? 'bg-amber-400 h-6 animate-pulse' : isSpeaking ? 'bg-cyan-400 h-6 animate-pulse' : 'bg-slate-500 h-2'}`} />
                <span className={`w-0.5 rounded-full transition-all ${isListening ? 'bg-amber-400 h-3 animate-pulse' : isSpeaking ? 'bg-cyan-400 h-3 animate-pulse' : 'bg-slate-500 h-3.5'}`} />
              </div>

              {/* Text Input Field */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                placeholder="Speak or type a message..."
                className="w-full bg-transparent border-none text-xs lg:text-sm text-slate-100 placeholder-slate-400/80 focus:outline-none font-sans font-light px-2"
              />

              {/* Stop Speaking Barge-In Button */}
              {isSpeaking && (
                <button
                  onClick={onStopSpeaking}
                  className="w-8 h-8 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 flex items-center justify-center transition-all animate-pulse"
                  title="Stop Speaking"
                >
                  <VolumeX className="w-4 h-4" />
                </button>
              )}

              {/* Microphone Pill Button */}
              <button
                onClick={onToggleMic}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-amber-500/20 border border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse'
                    : 'bg-slate-800/60 border border-slate-600/40 text-slate-300 hover:border-slate-400 hover:text-white'
                }`}
                title={isListening ? 'Microphone Active (Always Listening)' : 'Start Continuous Microphone'}
              >
                {isListening ? <Mic className="w-4 h-4 text-amber-400" /> : <MicOff className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isProcessing}
                className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-600/40 disabled:opacity-30 flex items-center justify-center transition-all"
                title="Send Message"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Right Quote Widget */}
          <div className="hidden lg:flex lg:col-span-3 flex-col items-end text-xs font-serif-luxury italic text-slate-400/80 space-y-1">
            <div>"Discipline today,</div>
            <div>a free tomorrow."</div>
            <div className="w-5 h-[1px] bg-slate-600/50 mt-1" />
          </div>
        </div>
      </footer>

      {/* SLIDE-OUT DRAWER FOR FULL CONVERSATION & SYSTEM TELEMETRY */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-[#080d1a]/95 border-l border-cyan-500/20 shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-slate-950/80">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      activeTab === 'chat'
                        ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 inline mr-1.5" /> Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('telemetry')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      activeTab === 'telemetry'
                        ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5 inline mr-1.5" /> Telemetry
                  </button>
                </div>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-hidden p-4">
                {activeTab === 'chat' ? (
                  <RightChatPanel
                    messages={messages}
                    isProcessing={isProcessing}
                    isMicActive={isListening}
                    onSendMessage={onSendMessage}
                    onClearHistory={onClearHistory}
                    onToggleMic={onToggleMic}
                    inputRef={inputRef}
                  />
                ) : (
                  <LeftSidebar onWeatherUpdate={onWeatherUpdate} />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
