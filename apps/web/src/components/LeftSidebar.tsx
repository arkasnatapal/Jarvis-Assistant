import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Cloud, Sun, CloudRain, Snowflake, CloudLightning, Camera, Power, Activity, ShieldCheck } from 'lucide-react';
import { fetchLiveWeather, WeatherData } from '../services/weather.js';

interface LeftSidebarProps {
  onWeatherUpdate?: (weather: WeatherData) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ onWeatherUpdate }) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(439);
  const [weather, setWeather] = useState<WeatherData>({
    temp: 25.2,
    city: 'Detecting Location...',
    country: '',
    description: 'Fetching weather data...',
    humidity: 75,
    windSpeed: 4.2,
    feelsLike: 26.0,
    weatherCode: 2,
    loading: true
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  const loadWeather = async () => {
    setWeather((prev) => ({ ...prev, loading: true }));
    const data = await fetchLiveWeather();
    setWeather(data);
    onWeatherUpdate?.(data);
  };

  useEffect(() => {
    loadWeather();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (cameraActive) {
      navigator.mediaDevices?.getUserMedia({ video: true })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          setCameraActive(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraActive]);

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return <Sun className="w-10 h-10 text-amber-400/90 animate-pulse" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-10 h-10 text-cyan-400/90" />;
    if (code >= 71 && code <= 86) return <Snowflake className="w-10 h-10 text-blue-300" />;
    if (code >= 95) return <CloudLightning className="w-10 h-10 text-amber-400" />;
    return <Cloud className="w-10 h-10 text-cyan-400/80" />;
  };

  return (
    <aside className="w-full lg:w-80 flex flex-col gap-3.5 overflow-y-auto pr-1">
      {/* 1. System Stats Card */}
      <div className="hud-glass-card rounded-xl p-3.5 border border-cyan-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono font-bold text-cyan-300 tracking-wider">System Stats</h3>
          </div>
          <button className="text-slate-400 hover:text-cyan-300 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* CPU Usage Bar */}
        <div className="space-y-1 mb-2.5">
          <div className="flex justify-between text-[11px] font-mono text-slate-300">
            <span>CPU Usage</span>
            <span className="text-cyan-400 font-bold">8%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-cyan-400 rounded-full w-[8%] shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
          </div>
        </div>

        {/* RAM Usage Bar */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-[11px] font-mono text-slate-300">
            <span>RAM Usage</span>
            <span className="text-cyan-400 font-bold">7 GB</span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-cyan-400 rounded-full w-[44%] shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
          </div>
        </div>

        {/* 3 Metric Grid */}
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono border-t border-slate-800/80 pt-2 text-[10px]">
          <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px]">CPU</span>
            <span className="text-cyan-300 font-bold">8%</span>
          </div>
          <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px]">Memory</span>
            <span className="text-cyan-300 font-bold">44%</span>
          </div>
          <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px]">Disk</span>
            <span className="text-cyan-300 font-bold">439/475 GB</span>
          </div>
        </div>
      </div>

      {/* 2. Weather Card (Live Free Open-Meteo API + Geolocation) */}
      <div className="hud-glass-card rounded-xl p-3.5 border border-cyan-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Cloud className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono font-bold text-cyan-300 tracking-wider">Weather</h3>
          </div>
          <button
            onClick={loadWeather}
            disabled={weather.loading}
            className="text-slate-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
            title="Refresh Live Weather"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${weather.loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-bold font-mono text-cyan-200">
              {weather.loading ? '...' : `${weather.temp}°C`}
            </div>
            <div className="text-xs text-slate-300 font-medium truncate max-w-[170px]">
              {weather.city}{weather.country ? `, ${weather.country}` : ''}
            </div>
            <div className="text-[10px] text-slate-400 italic">
              {weather.description}
            </div>
          </div>
          {getWeatherIcon(weather.weatherCode)}
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center font-mono border-t border-slate-800/80 pt-2 text-[10px]">
          <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px]">Humidity</span>
            <span className="text-cyan-300 font-bold">{weather.humidity}%</span>
          </div>
          <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px]">Wind</span>
            <span className="text-cyan-300 font-bold">{weather.windSpeed} m/s</span>
          </div>
          <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px]">Feels Like</span>
            <span className="text-cyan-300 font-bold">{weather.feelsLike}°C</span>
          </div>
        </div>
      </div>

      {/* 3. Camera Card */}
      <div className="hud-glass-card rounded-xl p-3.5 border border-cyan-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono font-bold text-cyan-300 tracking-wider">Camera</h3>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCameraActive(!cameraActive)}
              className={`p-1 rounded transition-colors ${cameraActive ? 'text-emerald-400' : 'text-slate-400 hover:text-cyan-300'}`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative w-full h-32 bg-slate-950 rounded-lg border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
          {cameraActive ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center space-y-1.5 text-slate-500">
              <Camera className="w-7 h-7" />
              <span className="text-xs font-mono font-medium">Camera Off</span>
            </div>
          )}
        </div>
        <p className="text-[9px] text-slate-500 font-mono text-center mt-2">
          {cameraActive ? 'Camera active. Monitoring visual feed.' : 'Camera is inactive. Click the power button to start.'}
        </p>
      </div>

      {/* 4. System Uptime Card */}
      <div className="hud-glass-card rounded-xl p-3.5 border border-cyan-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono font-bold text-cyan-300 tracking-wider">System Uptime</h3>
          </div>
          <span className="text-xs font-mono text-cyan-400 font-bold">{formatTime(uptimeSeconds)}</span>
        </div>

        <div className="flex justify-between items-center text-xs font-mono text-slate-300 mb-2">
          <span>System Running For:</span>
          <span className="text-cyan-300 font-bold">{formatTime(uptimeSeconds)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center font-mono mb-2 text-[10px]">
          <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px]">Session</span>
            <span className="text-cyan-300 font-bold">1</span>
          </div>
          <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
            <span className="text-slate-400 block text-[9px]">Commands</span>
            <span className="text-cyan-300 font-bold">0</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>System Load</span>
            <span className="text-cyan-400 font-bold">Moderate 26%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-cyan-400 rounded-full w-[26%]"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};
