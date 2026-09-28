import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, X } from 'lucide-react';

interface ArmConfirmDialogProps {
  isOpen: boolean;
  throttle: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ArmConfirmDialog: React.FC<ArmConfirmDialogProps> = ({
  isOpen,
  throttle,
  onConfirm,
  onCancel,
}) => {
  const [clearedProps, setClearedProps] = useState(false);
  const [standoffConfirmed, setStandoffConfirmed] = useState(false);

  if (!isOpen) return null;

  const isThrottleSafe = throttle <= 5;
  const canArm = isThrottleSafe && clearedProps && standoffConfirmed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-950 border-2 border-rose-600 rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.4)] p-5 text-slate-100 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-900/60 mb-4">
          <div className="flex items-center gap-2 text-rose-500">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
            <h2 className="text-base font-bold tracking-wider">ARM MOTORS CONFIRMATION</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Throttle Interlock Check */}
        {!isThrottleSafe ? (
          <div className="mb-4 p-3 bg-rose-950/80 border border-rose-500 rounded-lg text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-300">THROTTLE INTERLOCK LOCKOUT</p>
              <p className="text-rose-200 mt-1">
                Current throttle is <span className="underline font-bold">{throttle}%</span>. Safety regulations require throttle stick to be fully at <span className="font-bold">0%</span> before arming quadcopter motors.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-2.5 bg-emerald-950/50 border border-emerald-600/60 rounded-lg text-xs flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Throttle stick at 0% (Idle safety interlock verified).</span>
          </div>
        )}

        {/* Safety Pre-flight Checklist */}
        <div className="space-y-3 mb-5 text-xs">
          <p className="text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
            Mandatory Deliberate Pre-Arm Checks:
          </p>

          <label className="flex items-start gap-3 p-2.5 rounded bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={clearedProps}
              onChange={(e) => setClearedProps(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-rose-600 rounded bg-slate-800 border-slate-700"
            />
            <span className="text-slate-300 leading-tight">
              Quadcopter propellers and motor radius are 100% clear of obstacles, cables, and personnel.
            </span>
          </label>

          <label className="flex items-start gap-3 p-2.5 rounded bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={standoffConfirmed}
              onChange={(e) => setStandoffConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-rose-600 rounded bg-slate-800 border-slate-700"
            />
            <span className="text-slate-300 leading-tight">
              Pilot and spectators maintain minimum 5m standoff distance and ready to tap EMERGENCY STOP.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-900">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
          >
            ABORT / CANCEL
          </button>
          <button
            type="button"
            disabled={!canArm}
            onClick={() => {
              if (canArm) {
                onConfirm();
              }
            }}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg ${
              canArm
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>CONFIRM & ARM MOTORS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
