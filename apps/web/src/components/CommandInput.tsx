import React, { useState, KeyboardEvent } from 'react';
import { Send, Terminal, Zap } from 'lucide-react';

interface CommandInputProps {
  onSendMessage: (text: string) => void;
  isDisabled: boolean;
}

export const CommandInput: React.FC<CommandInputProps> = ({ onSendMessage, isDisabled }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || isDisabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const presets = [
    'Hello JARVIS',
    'What time is it?',
    'Calculate 482 * 37',
    'JARVIS, test yourself.',
    'What is system status?'
  ];

  return (
    <div className="mt-4 space-y-2.5">
      {/* Preset Quick Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <span className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider">
          <Zap className="w-3 h-3 text-cyan-400" /> Presets:
        </span>
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onSendMessage(preset)}
            disabled={isDisabled}
            className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0 text-[11px]"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Main Command Input Box */}
      <div className="relative glass-panel rounded-xl p-1.5 flex items-center border border-cyan-500/30 focus-within:border-cyan-400 focus-within:cyan-border-glow transition-all">
        <div className="pl-3 pr-2 text-cyan-400">
          <Terminal className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder={isDisabled ? 'JARVIS processing request...' : 'Enter command or ask JARVIS a question...'}
          className="w-full bg-transparent py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isDisabled}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold font-mono text-xs flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-cyan-600 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
        >
          <span>SEND</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
