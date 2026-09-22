import React from 'react';
import { ConfirmationRequest } from '@jarvis/shared';
import { ShieldAlert, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface ConfirmationModalProps {
  request: ConfirmationRequest;
  onConfirm: (approved: boolean) => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ request, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0b1021] border border-cyan-500/40 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.25)] p-6 overflow-hidden">
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500" />

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-cyan-500/20">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold tracking-wider text-cyan-300 uppercase">
              JARVIS Security Boundary
            </h3>
            <p className="text-xs font-mono text-slate-400">Action Requires Confirmation</p>
          </div>
        </div>

        {/* Content Box */}
        <div className="space-y-4 mb-6">
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Requested Tool:</span>
              <span className="text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30">
                {request.toolName}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span>Risk Classification:</span>
              <span className="text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/30">
                {request.riskLevel}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-slate-400 block mb-1 font-semibold">Action Summary:</span>
              <p className="text-slate-200 text-sm font-sans bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                {request.actionDescription}
              </p>
            </div>

            {request.reason && (
              <div className="text-[11px] text-slate-400 italic">
                Reason: {request.reason}
              </div>
            )}
          </div>

          <div className="flex items-start space-x-2 text-[11px] font-mono text-amber-400/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              JARVIS will not perform this desktop operation without your explicit authorization.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={() => onConfirm(false)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-mono text-xs font-semibold transition-all duration-200"
          >
            <XCircle className="w-4 h-4" />
            <span>DENY</span>
          </button>

          <button
            onClick={() => onConfirm(true)}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-200"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ALLOW ONCE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
