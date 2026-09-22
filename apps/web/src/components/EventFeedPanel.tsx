import React from 'react';
import { JarvisEvent } from '@jarvis/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ShieldAlert, CheckCircle2, Clock, Wrench, ArrowRight } from 'lucide-react';

interface EventFeedPanelProps {
  events: JarvisEvent[];
}

export const EventFeedPanel: React.FC<EventFeedPanelProps> = ({ events }) => {
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toTimeString().split(' ')[0];
  };

  const getEventIcon = (type: string) => {
    if (type.startsWith('tool')) return <Wrench className="w-3 h-3 text-amber-400" />;
    if (type.startsWith('llm')) return <Terminal className="w-3 h-3 text-cyan-400" />;
    if (type.includes('error') || type.includes('failed')) return <ShieldAlert className="w-3 h-3 text-rose-400" />;
    if (type.includes('completed')) return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    return <Clock className="w-3 h-3 text-slate-400" />;
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
      case 'HIGH':
        return 'text-rose-400 border-rose-500/30 bg-rose-950/40';
      case 'MEDIUM':
        return 'text-amber-400 border-amber-500/30 bg-amber-950/40';
      case 'LOW':
      default:
        return 'text-cyan-400/80 border-cyan-500/20 bg-cyan-950/20';
    }
  };

  return (
    <div className="glass-panel p-4 rounded-xl h-full flex flex-col border border-cyan-500/20">
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/10 mb-3">
        <h3 className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          Event & Activity Log
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/20">
          {events.length} EVENTS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs max-h-[380px] lg:max-h-[520px]">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 italic text-center p-6">
            Awaiting system activity events...
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.slice(0, 40).map((evt) => (
              <motion.div
                key={evt.eventId}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="p-2 rounded bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 flex items-start justify-between gap-2 group transition-colors"
              >
                <div className="flex items-start space-x-2 overflow-hidden">
                  <span className="mt-0.5">{getEventIcon(evt.eventType)}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-400">{formatTime(evt.timestamp)}</span>
                      <span className="text-cyan-300 font-semibold">{evt.eventType}</span>
                    </div>
                    {evt.payload && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-[280px]">
                        {JSON.stringify(evt.payload)}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getPriorityBadge(evt.priority)}`}>
                  {evt.priority}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
