import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { DisplayMessage } from '../types.js';
import { Trash2, Download, Send, Bot, User, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RightChatPanelProps {
  messages: DisplayMessage[];
  isProcessing: boolean;
  isMicActive?: boolean;
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  onToggleMic?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const RightChatPanel: React.FC<RightChatPanelProps> = ({
  messages,
  isProcessing,
  isMicActive = false,
  onSendMessage,
  onClearHistory,
  onToggleMic,
  inputRef
}) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSend = () => {
    if (!inputText.trim() || isProcessing) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `jarvis_conversation_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <aside className="w-full lg:w-96 flex flex-col h-full hud-glass-card rounded-xl border border-cyan-500/20 overflow-hidden">
      {/* Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-cyan-500/20 bg-slate-950/60">
        <h3 className="text-sm font-mono font-bold text-cyan-300 tracking-wider flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          Conversation
        </h3>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onClearHistory}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition-all flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
          <button
            onClick={handleExport}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-all flex items-center gap-1"
          >
            <Download className="w-3 h-3" /> Extract Conversation
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans text-xs min-h-[350px] max-h-[550px] lg:max-h-none">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6 space-y-2">
            <Bot className="w-8 h-8 text-cyan-500/30 animate-pulse" />
            <p className="font-mono text-xs text-slate-400">
              Hello, I am JARVIS. How can I assist you today sir?
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Main Speech Bubble */}
                <div
                  className={`p-3 rounded-xl max-w-[90%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-100 rounded-tr-none'
                      : 'bg-slate-900/90 border border-cyan-500/20 text-slate-200 rounded-tl-none shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className="block text-[9px] font-mono text-slate-400 mt-1 text-right">
                    {msg.timestamp}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {isProcessing && (
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 p-2 bg-slate-900/60 rounded border border-cyan-500/20">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>JARVIS is processing...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Box Footer */}
      <div className="p-3 border-t border-cyan-500/20 bg-slate-950/80">
        <div className="relative flex items-center bg-slate-900/90 border border-cyan-500/30 rounded-lg focus-within:border-cyan-400 focus-within:cyan-border-glow transition-all">
          <input
            ref={inputRef as any}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder="Type a message..."
            className="w-full bg-transparent px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
          />

          {onToggleMic && (
            <button
              onClick={onToggleMic}
              className={`p-2 mr-1 rounded transition-all flex items-center justify-center ${
                isMicActive ? 'bg-amber-500 text-slate-950 animate-pulse' : 'text-slate-400 hover:text-cyan-300'
              }`}
              title="Toggle Voice Mic"
            >
              <Wrench className="w-3.5 h-3.5 hidden" />
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isProcessing}
            className="p-2 mr-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 disabled:opacity-40 transition-all flex items-center justify-center"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
