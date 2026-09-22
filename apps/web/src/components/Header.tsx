import React, { useState, useEffect } from 'react';
import { Clock, Thermometer, Settings } from 'lucide-react';
import { WeatherData } from '../services/weather.js';

interface HeaderProps {
  isConnected: boolean;
  weather?: WeatherData;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isConnected, weather, onOpenSettings }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));
      setDateStr(now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-cyan-500/20 bg-[#040711]/90 backdrop-blur-md sticky top-0 z-30">
      {/* Left Branding */}
      <div className="flex items-center space-x-3">
        <h1 className="text-xl font-extrabold tracking-[0.35em] text-cyan-400 cyan-glow-text font-mono">
          J.A.R.V.I.S
        </h1>
        <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`}></span>
          <span className="text-[11px] font-mono font-medium text-emerald-400">
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Center Clock & Date Pill */}
      <div className="hidden md:flex items-center space-x-3 px-4 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/20 text-xs font-mono text-cyan-300">
        <Clock className="w-3.5 h-3.5 text-cyan-400" />
        <span>{timeStr}</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300">{dateStr}</span>
      </div>

      {/* Right Weather & Settings */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/20 text-xs font-mono text-cyan-300">
          <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
          <span>{weather?.loading ? '...' : `${weather?.temp ?? 25.2}°C`}</span>
          <span className="text-slate-400 text-[10px] truncate max-w-[100px]">
            {weather?.city ?? 'Location'}
          </span>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-all"
          title="JARVIS Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
