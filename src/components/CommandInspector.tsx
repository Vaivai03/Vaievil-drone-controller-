import React, { useState } from 'react';
import { Terminal, X, Trash2, Send, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { CommandLogEntry } from '../types/drone';

interface CommandInspectorProps {
  isOpen: boolean;
  log: CommandLogEntry[];
  lastRawCommand: string;
  onClose: () => void;
  onClearLog: () => void;
  onInjectCommand: (cmd: string) => void;
}

export const CommandInspector: React.FC<CommandInspectorProps> = ({
  isOpen,
  log,
  lastRawCommand,
  onClose,
  onClearLog,
  onInjectCommand,
}) => {
  const [customCmd, setCustomCmd] = useState('');

  if (!isOpen) return null;

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCmd.trim()) return;
    onInjectCommand(customCmd.trim());
    setCustomCmd('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col font-mono text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">COMMAND PACKET INSPECTOR (TEST MODE)</h2>
              <p className="text-[10px] text-slate-400">Live stream of UDP control packets and hardware ACK replies</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearLog}
              title="Clear Log"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Command Strip */}
        <div className="px-5 py-2.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Latest Output:</span>
            <code className="bg-slate-900 px-2 py-0.5 rounded text-emerald-400 font-bold border border-emerald-900/40">
              {lastRawCommand || 'IDLE (Awaiting stick movement)'}
            </code>
          </div>
          <span className="text-[10px] text-slate-500">{log.length} packets logged</span>
        </div>

        {/* Live Packet Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 text-xs font-mono">
          {log.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500">
              <Terminal className="w-8 h-8 stroke-1 mb-2 text-slate-600" />
              <p>No packets logged yet. Move joysticks or trigger commands to view transmission stream.</p>
            </div>
          ) : (
            log.map((entry) => {
              const isMovement = entry.type === 'JOYSTICK';
              const isEstop = entry.type === 'ESTOP';
              const isArm = entry.type === 'ARM';
              const isDisarm = entry.type === 'DISARM';

              let badgeColor = 'text-sky-400 bg-sky-950/60 border-sky-800';
              if (isEstop) badgeColor = 'text-rose-400 bg-rose-950 border-rose-600 font-bold animate-pulse';
              else if (isArm) badgeColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-700';
              else if (isDisarm) badgeColor = 'text-amber-400 bg-amber-950/80 border-amber-700';

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="text-[10px] text-slate-500 shrink-0">{entry.timestamp}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${badgeColor} shrink-0`}>
                      {entry.type}
                    </span>
                    <code className="text-slate-200 truncate">{entry.rawCommand}</code>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[11px]">
                    {entry.roundTripMs !== undefined && (
                      <span className="text-slate-500 tabular-nums">{entry.roundTripMs}ms</span>
                    )}
                    {entry.status === 'SENT' && (
                      <span className="text-sky-400 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>TX</span>
                      </span>
                    )}
                    {entry.status === 'ACKNOWLEDGED' && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ACK</span>
                      </span>
                    )}
                    {entry.status === 'DROPPED' && (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>LOST</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Custom Packet Injection Bar */}
        <form
          onSubmit={handleSendCustom}
          className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2 text-xs"
        >
          <span className="text-slate-400 font-semibold shrink-0">Inject Raw:</span>
          <input
            type="text"
            value={customCmd}
            onChange={(e) => setCustomCmd(e.target.value)}
            placeholder="e.g. THROTTLE=25;YAW=10;PITCH=0;ROLL=0"
            className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            disabled={!customCmd.trim()}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white rounded font-bold flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
