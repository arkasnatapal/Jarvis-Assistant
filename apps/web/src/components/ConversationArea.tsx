import React, { useEffect, useRef } from 'react';
import { DisplayMessage } from '../types.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Wrench, Sparkles } from 'lucide-react';

interface ConversationAreaProps {
  messages: DisplayMessage[];
  isProcessing: boolean;
}

export const ConversationArea: React.FC<ConversationAreaProps> = ({ messages, isProcessing }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  return (
    <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col min-h-[380px] lg:min-h-[500px] border border-cyan-500/20 overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/10 mb-4">
        <h2 className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          JARVIS Neural Interface & Feed
        </h2>
        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
          ACTIVE CHAT
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8 space-y-3">
            <Bot className="w-12 h-12 text-cyan-500/30 animate-pulse" />
            <p className="text-sm font-mono text-slate-400">
              JARVIS System ready for input.
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              Type a prompt or choose a quick action below to interact with the Core Orchestrator & Tool Registry.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender !== 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center flex-shrink-0 mt-1 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                    <Bot className="w-4 h-4 text-cyan-400" />
                  </div>
                )}

                <div className="max-w-[85%] sm:max-w-[75%] space-y-1">
                  {/* Main Message Bubble */}
                  <div
                    className={`p-3.5 rounded-xl text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-100 rounded-tr-none shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{msg.timestamp}</span>
                      {msg.isStreaming && (
                        <span className="text-cyan-400 animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                          Streaming...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-3 p-3 rounded-lg bg-slate-900/60 border border-cyan-500/20 max-w-xs"
          >
            <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-500/40 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            </div>
            <span className="text-xs font-mono text-cyan-300 animate-pulse">
              JARVIS is thinking & processing...
            </span>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
