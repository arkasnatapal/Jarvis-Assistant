import React from 'react';
import { ComponentStatusMap } from '../types.js';
import { Server, Cpu, Wrench, Wifi, Layers, Monitor } from 'lucide-react';
import { LocalAgentInfo } from '@jarvis/shared';

interface SystemStatusPanelProps {
  status: ComponentStatusMap;
  isConnected: boolean;
  agentInfo?: LocalAgentInfo;
}

export const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({ status, isConnected, agentInfo }) => {
  const getBadgeClass = (state: string) => {
    switch (state) {
      case 'ONLINE':
      case 'CONNECTED':
      case 'READY':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]';
      case 'DEGRADED':
        return 'bg-amber-950/60 text-amber-400 border-amber-500/40';
      case 'REMOTE_CONTROL_DISABLED':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/60 font-extrabold animate-pulse';
      case 'OFFLINE':
      case 'DISCONNECTED':
      default:
        return 'bg-rose-950/60 text-rose-400 border-rose-500/40';
    }
  };

  const agentStatusText = agentInfo
    ? agentInfo.status === 'REMOTE_CONTROL_DISABLED'
      ? 'DISABLED'
      : agentInfo.status
    : 'OFFLINE';

  const items = [
    { label: 'CORE', state: status.core || 'ONLINE', icon: Layers },
    { label: 'SERVER', state: status.server || 'ONLINE', icon: Server },
    { label: 'LLM', state: status.llm || 'ONLINE', icon: Cpu },
    { label: 'WEBSOCKET', state: isConnected ? 'CONNECTED' : 'DISCONNECTED', icon: Wifi },
    { label: 'AGENT', state: agentStatusText, icon: Monitor, title: agentInfo ? `ID: ${agentInfo.agentId} | Caps: ${agentInfo.capabilities.length}` : 'Agent Disconnected' },
    { label: 'TOOLS', state: status.tools || 'READY', icon: Wrench }
  ];

  return (
    <div className="glass-panel p-4 rounded-xl mb-4 border border-cyan-500/20">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-500/10">
        <h3 className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
          System Component Status
        </h3>
        <span className="text-[10px] font-mono text-slate-500">LIVE TELEMETRY</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              title={item.title}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all duration-200"
            >
              <div className="flex items-center space-x-2">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-mono text-slate-300 font-semibold">{item.label}</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getBadgeClass(item.state)}`}>
                {item.state}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
