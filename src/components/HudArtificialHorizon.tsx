import React from 'react';
import { DroneTelemetry, ArmState } from '../types/drone';

interface HudProps {
  telemetry: DroneTelemetry;
  armState: ArmState;
  throttle: number;
}

export const HudArtificialHorizon: React.FC<HudProps> = ({
  telemetry,
  armState,
  throttle,
}) => {
  const { pitchAngle, rollAngle, heading, altitudeMeters, batteryPercent, batteryVoltage, rssiDbm, motorRpms } = telemetry;

  // Pitch ladder offset: 1 deg = 1.2px
  const pitchOffset = -pitchAngle * 1.4;

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-2 select-none overflow-hidden text-xs font-mono">
      {/* Background Attitude Indicator Gyro Frame */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div
          className="relative w-56 h-56 rounded-full border border-sky-500/25 overflow-hidden flex items-center justify-center"
          style={{ transform: `rotate(${-rollAngle}deg)` }}
        >
          {/* Horizon Line */}
          <div
            className="absolute w-full h-[2px] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            style={{ transform: `translateY(${pitchOffset}px)` }}
          />

          {/* Pitch Ladder Marks */}
          <div
            className="absolute flex flex-col items-center gap-4 text-[9px] text-sky-300 font-bold"
            style={{ transform: `translateY(${pitchOffset}px)` }}
          >
            <div className="flex items-center gap-2">
              <span className="w-4 h-[1px] bg-sky-400" />
              <span>+20</span>
              <span className="w-4 h-[1px] bg-sky-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-[1px] bg-sky-400" />
              <span>+10</span>
              <span className="w-6 h-[1px] bg-sky-400" />
            </div>
            <div className="w-12 h-[1px] bg-transparent" />
            <div className="flex items-center gap-2">
              <span className="w-6 h-[1px] bg-sky-400" />
              <span>-10</span>
              <span className="w-6 h-[1px] bg-sky-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-[1px] bg-sky-400" />
              <span>-20</span>
              <span className="w-4 h-[1px] bg-sky-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Aircraft Reticle in Center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">
          {/* Center Reticle Dot */}
          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          <div className="absolute -left-7 w-5 h-[2px] bg-amber-400" />
          <div className="absolute -right-7 w-5 h-[2px] bg-amber-400" />
          <div className="absolute -bottom-3 w-[2px] h-3 bg-amber-400" />
        </div>
      </div>

      {/* Top Heading Tape */}
      <div className="relative z-10 flex items-center justify-between px-3 py-1 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-sm rounded">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">HDG</span>
          <span className="text-sky-400 font-bold tabular-nums text-sm">{heading.toString().padStart(3, '0')}°</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400">PITCH</span>
          <span className="text-white font-bold tabular-nums">{pitchAngle > 0 ? `+${pitchAngle}` : pitchAngle}°</span>
          <span className="text-slate-400">ROLL</span>
          <span className="text-white font-bold tabular-nums">{rollAngle > 0 ? `+${rollAngle}` : rollAngle}°</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">ALT</span>
          <span className="text-emerald-400 font-bold tabular-nums text-sm">{altitudeMeters.toFixed(1)}m</span>
        </div>
      </div>

      {/* Middle Motor RPM Quad Visualization */}
      <div className="relative z-10 flex justify-between items-center px-4">
        {/* Left Motors (M4 Front-Left, M3 Rear-Left) */}
        <div className="flex flex-col gap-2">
          <div className="bg-slate-900/70 border border-slate-800 p-1.5 rounded w-24">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>M4 (FL)</span>
              <span className="text-sky-300 font-bold tabular-nums">{motorRpms[3]}</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded mt-1 overflow-hidden">
              <div
                className="bg-sky-400 h-full transition-all duration-75"
                style={{ width: `${Math.min(100, (motorRpms[3] / 10000) * 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 p-1.5 rounded w-24">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>M3 (RL)</span>
              <span className="text-sky-300 font-bold tabular-nums">{motorRpms[2]}</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded mt-1 overflow-hidden">
              <div
                className="bg-sky-400 h-full transition-all duration-75"
                style={{ width: `${Math.min(100, (motorRpms[2] / 10000) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Motors (M1 Front-Right, M2 Rear-Right) */}
        <div className="flex flex-col gap-2">
          <div className="bg-slate-900/70 border border-slate-800 p-1.5 rounded w-24 text-right">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>M1 (FR)</span>
              <span className="text-sky-300 font-bold tabular-nums">{motorRpms[0]}</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded mt-1 overflow-hidden">
              <div
                className="bg-sky-400 h-full transition-all duration-75"
                style={{ width: `${Math.min(100, (motorRpms[0] / 10000) * 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 p-1.5 rounded w-24 text-right">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>M2 (RR)</span>
              <span className="text-sky-300 font-bold tabular-nums">{motorRpms[1]}</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded mt-1 overflow-hidden">
              <div
                className="bg-sky-400 h-full transition-all duration-75"
                style={{ width: `${Math.min(100, (motorRpms[1] / 10000) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Tape */}
      <div className="relative z-10 flex items-center justify-between px-3 py-1 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-sm rounded">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">THR OUTPUT</span>
          <span className="text-emerald-400 font-bold tabular-nums">{throttle}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">LI-PO</span>
          <span className={`font-bold tabular-nums ${batteryPercent < 25 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {batteryPercent}% ({batteryVoltage.toFixed(1)}V)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">RSSI</span>
          <span className="text-sky-400 font-bold tabular-nums">{rssiDbm} dBm</span>
        </div>
      </div>
    </div>
  );
};
