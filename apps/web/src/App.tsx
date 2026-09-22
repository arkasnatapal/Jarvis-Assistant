import React, { useState, useEffect, useRef } from 'react';
import { JarvisLuxuryUI } from './components/JarvisLuxuryUI.js';
import { socketService } from './services/socket.js';
import { DisplayMessage } from './types.js';
import { JarvisEvent, VoiceState, SupportedLanguage, LanguageDetector, LocalAgentInfo, ConfirmationRequest } from '@jarvis/shared';
import { fetchLiveWeather, WeatherData } from './services/weather.js';
import { playWakePingSound } from './services/sound.js';
import { WebSpeechSTTProvider, MockSTTProvider, STTProvider } from './services/stt.js';
import { WebSpeechTTSProvider, MockTTSProvider, TTSProvider } from './services/tts.js';
import { VADManager } from './services/vad.js';
import { voiceStateMachine } from './services/voiceStateMachine.js';

export const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [sessionId] = useState<string>(() => `sess_${Math.random().toString(36).substring(2, 9)}`);
  const [weather, setWeather] = useState<WeatherData | undefined>(undefined);
  const [agentInfo, setAgentInfo] = useState<LocalAgentInfo | undefined>(undefined);
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmationRequest | null>(null);

  useEffect(() => {
    // Automatically fetch live weather on app startup
    fetchLiveWeather().then((data) => {
      setWeather(data);
    });
  }, []);

  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: 'Hello, I am JARVIS. JARVIS core system is online and operational.',
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    }
  ]);
  const [events, setEvents] = useState<JarvisEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Voice State & Speech Options
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage>('en');
  const [liveTranscription, setLiveTranscription] = useState<string>('');
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(true);

  const chatInputRef = useRef<HTMLInputElement>(null);
  const sttProviderRef = useRef<STTProvider>(new WebSpeechSTTProvider());
  const ttsProviderRef = useRef<TTSProvider>(new WebSpeechTTSProvider());
  const vadManagerRef = useRef<VADManager>(new VADManager());
  const lastHandledTextRef = useRef<string>('');

  const WAKE_WORD_PURE_REGEX = /^(high\s+jarvis|hi\s+jarvis|hello\s+jarvis|greet\s+jarvis|hey\s+jarvis|ok\s+jarvis|okay\s+jarvis|yo\s+jarvis|good\s+(morning|afternoon|evening)\s+jarvis|jarvis)[!.,?]*$/i;
  const WAKE_WORD_PREFIX_REGEX = /^(high\s+jarvis|hi\s+jarvis|hello\s+jarvis|greet\s+jarvis|hey\s+jarvis|ok\s+jarvis|okay\s+jarvis|yo\s+jarvis|good\s+(morning|afternoon|evening)\s+jarvis|jarvis)\b[,.\s]*/i;

  const startListening = () => {
    if (voiceStateMachine.getCurrentState() === VoiceState.SPEAKING) {
      handleStopSpeaking();
    }

    voiceStateMachine.transitionTo(VoiceState.LISTENING);
    setLiveTranscription('');

    sttProviderRef.current.startListening(
      { language: detectedLanguage, continuous: true, interimResults: true },
      (result) => {
        // Prevent processing speech while JARVIS is speaking via TTS
        if (voiceStateMachine.getCurrentState() === VoiceState.SPEAKING) {
          return;
        }

        setLiveTranscription(result.text);

        if (result.text.trim()) {
          const rawText = result.text.trim();
          const lowerText = rawText.toLowerCase();

          // Filter out short noise/music artifacts (e.g., 1-2 letter background noise fragments)
          if (rawText.length <= 2 && !/^(hi|yo|ok|no|go|is|am|in|on|to|do|so|me|my)$/i.test(rawText)) {
            return;
          }

          const isPureWakeWord = WAKE_WORD_PURE_REGEX.test(lowerText);
          const hasWakeWordPrefix = WAKE_WORD_PREFIX_REGEX.test(lowerText);

          if (isPureWakeWord && lastHandledTextRef.current !== rawText) {
            lastHandledTextRef.current = rawText;
            playWakePingSound();

            const greeting = "Hello! How can I help you?";
            setMessages((prev) => [
              ...prev,
              {
                id: `msg_wake_${Date.now()}`,
                sender: 'assistant',
                text: greeting,
                timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
              }
            ]);

            voiceStateMachine.transitionTo(VoiceState.SPEAKING);
            sttProviderRef.current.stopListening();

            ttsProviderRef.current.speak(
              greeting,
              { language: detectedLanguage },
              () => {},
              () => {
                voiceStateMachine.transitionTo(VoiceState.IDLE);
                setLiveTranscription('');
                setTimeout(() => {
                  lastHandledTextRef.current = '';
                  if (isContinuousMode) {
                    startListening();
                  }
                }, 300);
              },
              () => {
                voiceStateMachine.transitionTo(VoiceState.IDLE);
                setLiveTranscription('');
                lastHandledTextRef.current = '';
                if (isContinuousMode) {
                  startListening();
                }
              }
            );
          } else if (result.isFinal && hasWakeWordPrefix && lastHandledTextRef.current !== rawText) {
            lastHandledTextRef.current = rawText;
            playWakePingSound();
            const cleanPrompt = rawText.replace(WAKE_WORD_PREFIX_REGEX, '').trim();
            voiceStateMachine.transitionTo(VoiceState.TRANSCRIBING);
            handleSendMessage(cleanPrompt || rawText);
            setTimeout(() => { lastHandledTextRef.current = ''; }, 2000);
          } else if (result.isFinal && lastHandledTextRef.current !== rawText) {
            lastHandledTextRef.current = rawText;
            voiceStateMachine.transitionTo(VoiceState.TRANSCRIBING);
            handleSendMessage(rawText);
            setTimeout(() => { lastHandledTextRef.current = ''; }, 2000);
          }
        }
      },
      (err) => {
        console.error('STT Error:', err);
      }
    );
  };

  // Auto-start continuous microphone listening on mount & user gesture
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sttProviderRef.current.isAvailable()) {
        try {
          startListening();
        } catch (e) {
          console.log("Auto-start mic pending user gesture", e);
        }
      }
    }, 600);

    const handleUserInteraction = () => {
      if (voiceStateMachine.getCurrentState() === VoiceState.IDLE) {
        try {
          startListening();
        } catch {}
      }
    };

    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    // Fallback to Mock STT/TTS if browser Web Speech API is absent
    if (!sttProviderRef.current.isAvailable()) {
      sttProviderRef.current = new MockSTTProvider();
    }
    if (!ttsProviderRef.current.isAvailable()) {
      ttsProviderRef.current = new MockTTSProvider();
    }

    const unsubscribe = voiceStateMachine.subscribe((newState) => {
      setVoiceState(newState);
    });

    socketService.connect(
      (status) => {
        if (status.agent) {
          setAgentInfo(status.agent);
        }
      },
      (evt) => {
        setEvents((prev) => [evt, ...prev]);
        if (evt.eventType === 'voice.language.detected' && evt.payload?.language) {
          setDetectedLanguage(evt.payload.language as SupportedLanguage);
        }
        if (evt.eventType === 'tool.confirmation_required' && evt.payload) {
          setPendingConfirmation(evt.payload as unknown as ConfirmationRequest);
        }
        if (evt.eventType === 'tool.confirmation_responded') {
          setPendingConfirmation(null);
        }
        if (evt.eventType.startsWith('agent.')) {
          if (evt.payload?.agentId) {
            setAgentInfo((prev) => ({
              ...(prev || {
                agentId: String(evt.payload.agentId),
                platform: 'windows',
                version: '0.3.0',
                capabilities: [],
                lastHeartbeat: Date.now(),
                killSwitchActive: false,
                status: 'ONLINE'
              }),
              status: evt.eventType === 'agent.disconnected' ? 'OFFLINE' : evt.eventType === 'agent.kill_switch.activated' ? 'REMOTE_CONTROL_DISABLED' : 'ONLINE',
              killSwitchActive: evt.eventType === 'agent.kill_switch.activated'
            }));
          }
        }
      },
      (chunkData) => {
        setMessages((prev) => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0 && prev[lastIndex].sender === 'assistant' && prev[lastIndex].isStreaming) {
            const updated = [...prev];
            updated[lastIndex] = {
              ...updated[lastIndex],
              text: updated[lastIndex].text + chunkData.chunk
            };
            return updated;
          } else {
            return [
              ...prev,
              {
                id: `msg_${Date.now()}`,
                sender: 'assistant',
                text: chunkData.chunk,
                timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
                isStreaming: true
              }
            ];
          }
        });
      },
      (completedData) => {
        setIsProcessing(false);
        const responseText = completedData.responseText;
        setMessages((prev) => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0 && prev[lastIndex].sender === 'assistant') {
            const updated = [...prev];
            updated[lastIndex] = {
              ...updated[lastIndex],
              text: responseText || updated[lastIndex].text,
              isStreaming: false,
              toolExecuted: completedData.toolExecuted
            };
            return updated;
          } else {
            return [
              ...prev,
              {
                id: `msg_${Date.now()}`,
                sender: 'assistant',
                text: responseText,
                timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
                isStreaming: false,
                toolExecuted: completedData.toolExecuted
              }
            ];
          }
        });

        // Speak assistant response via TTS and then auto-resume continuous listening
        if (responseText) {
          voiceStateMachine.transitionTo(VoiceState.SPEAKING);
          sttProviderRef.current.stopListening();
          ttsProviderRef.current.speak(
            responseText,
            { language: detectedLanguage },
            () => {},
            () => {
              voiceStateMachine.transitionTo(VoiceState.IDLE);
              if (isContinuousMode) {
                setTimeout(() => startListening(), 300);
              }
            },
            () => {
              voiceStateMachine.transitionTo(VoiceState.IDLE);
              if (isContinuousMode) {
                setTimeout(() => startListening(), 300);
              }
            }
          );
        } else {
          voiceStateMachine.transitionTo(VoiceState.IDLE);
          if (isContinuousMode) {
            setTimeout(() => startListening(), 300);
          }
        }
      },
      () => {
        setIsProcessing(false);
        voiceStateMachine.transitionTo(VoiceState.ERROR);
      },
      (connected) => {
        setIsConnected(connected);
      }
    );

    return () => {
      unsubscribe();
      socketService.disconnect();
      vadManagerRef.current.stopListening();
    };
  }, [detectedLanguage, isContinuousMode]);

  const handleSendMessage = (text: string) => {
    // If JARVIS is currently speaking, barge-in stop
    if (voiceState === VoiceState.SPEAKING) {
      handleStopSpeaking();
    }

    const lowerText = text.trim().toLowerCase();
    const isPureWakeWord = WAKE_WORD_PURE_REGEX.test(lowerText);

    if (isPureWakeWord) {
      playWakePingSound();
      const userMsg: DisplayMessage = {
        id: `msg_u_${Date.now()}`,
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      };
      const greeting = "Hello! How can I help you?";
      const assistantMsg: DisplayMessage = {
        id: `msg_a_${Date.now()}`,
        sender: 'assistant',
        text: greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      voiceStateMachine.transitionTo(VoiceState.SPEAKING);
      sttProviderRef.current.stopListening();
      ttsProviderRef.current.speak(
        greeting,
        { language: detectedLanguage },
        () => {},
        () => {
          voiceStateMachine.transitionTo(VoiceState.IDLE);
          if (isContinuousMode) {
            setTimeout(() => startListening(), 300);
          }
        },
        () => {
          voiceStateMachine.transitionTo(VoiceState.IDLE);
          if (isContinuousMode) {
            setTimeout(() => startListening(), 300);
          }
        }
      );
      return;
    }

    const correlationId = `corr_${Date.now()}`;
    const langMeta = LanguageDetector.detectLanguage(text);
    setDetectedLanguage(langMeta.language);

    const userMsg: DisplayMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);
    voiceStateMachine.transitionTo(VoiceState.THINKING);

    try {
      socketService.sendMessage(text, sessionId, correlationId);
    } catch {
      setIsProcessing(false);
      voiceStateMachine.transitionTo(VoiceState.ERROR);
    }
  };

  const handleConfirmAction = (approved: boolean) => {
    if (pendingConfirmation) {
      socketService.sendConfirmationResponse(pendingConfirmation.confirmationId, approved);
      setPendingConfirmation(null);
    }
  };

  const stopListening = () => {
    setIsContinuousMode(false);
    sttProviderRef.current.stopListening();
    voiceStateMachine.transitionTo(VoiceState.IDLE);
  };

  const handleToggleMic = () => {
    if (voiceState === VoiceState.LISTENING) {
      stopListening();
    } else {
      setIsContinuousMode(true);
      startListening();
    }
  };

  const handleStopSpeaking = () => {
    ttsProviderRef.current.stop();
    voiceStateMachine.transitionTo(VoiceState.INTERRUPTED);
    setTimeout(() => {
      voiceStateMachine.transitionTo(VoiceState.IDLE);
      if (isContinuousMode) {
        startListening();
      }
    }, 300);
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const handleFocusInput = () => {
    chatInputRef.current?.focus();
  };

  return (
    <JarvisLuxuryUI
      isConnected={isConnected}
      weather={weather}
      voiceState={voiceState}
      detectedLanguage={detectedLanguage}
      liveTranscription={liveTranscription}
      messages={messages}
      isProcessing={isProcessing}
      agentInfo={agentInfo}
      pendingConfirmation={pendingConfirmation}
      events={events}
      onSendMessage={handleSendMessage}
      onToggleMic={handleToggleMic}
      onStopSpeaking={handleStopSpeaking}
      onConfirmAction={handleConfirmAction}
      onClearHistory={handleClearHistory}
      onWeatherUpdate={setWeather}
    />
  );
};


