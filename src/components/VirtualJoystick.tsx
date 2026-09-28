import React, { useRef, useState, useCallback, useEffect } from 'react';

interface VirtualJoystickProps {
  label: string;
  isThrottleYaw?: boolean; // true = Left stick (Throttle & Yaw), false = Right stick (Pitch & Roll)
  springCenterVertical?: boolean; // For throttle: true = returns to center, false = friction hold
  deadzone?: number; // e.g. 5%
  invertPitch?: boolean;
  valueVertical: number; // Current value: 0..100 for throttle, -100..100 for pitch
  valueHorizontal: number; // Current value: -100..100 for yaw/roll
  onChange: (vertical: number, horizontal: number) => void;
  size?: number; // default 170
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  label,
  isThrottleYaw = false,
  springCenterVertical = false,
  deadzone = 5,
  invertPitch = false,
  valueVertical,
  valueHorizontal,
  onChange,
  size = 170,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const activePointerId = useRef<number | null>(null);

  const radius = size / 2;
  const maxThumbDistance = radius - 26;

  // Convert current state values into (x, y) visual thumb offset from center
  const getThumbOffset = (): { x: number; y: number } => {
    // Horizontal is always -100 to +100 -> -maxThumbDistance to +maxThumbDistance
    const x = (valueHorizontal / 100) * maxThumbDistance;

    let y = 0;
    if (isThrottleYaw) {
      // Throttle is 0 to 100 -> bottom (+maxThumbDistance) is 0%, top (-maxThumbDistance) is 100%
      const normY = 1 - (valueVertical / 100) * 2; // +1 at 0%, -1 at 100%
      y = normY * maxThumbDistance;
    } else {
      // Pitch is -100 to +100
      const pitchMultiplier = invertPitch ? -1 : 1;
      const normY = -((valueVertical * pitchMultiplier) / 100); // Up is positive pitch
      y = normY * maxThumbDistance;
    }

    return { x, y };
  };

  const thumbPos = getThumbOffset();

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    // Capture this pointer for isolated multi-touch
    containerRef.current.setPointerCapture(e.pointerId);
    activePointerId.current = e.pointerId;
    setIsDragging(true);

    processPointerCoords(e.clientX, e.clientY);
  };

  const processPointerCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxThumbDistance) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * maxThumbDistance;
        dy = Math.sin(angle) * maxThumbDistance;
      }

      // Normalized coordinates: -1.0 to +1.0
      let normX = dx / maxThumbDistance;
      let normY = dy / maxThumbDistance; // -1 is top, +1 is bottom

      // Apply Deadzone
      const deadzoneNorm = deadzone / 100;
      if (Math.abs(normX) < deadzoneNorm) normX = 0;
      if (Math.abs(normY) < deadzoneNorm && !isThrottleYaw) normY = 0;

      if (isThrottleYaw) {
        // Horizontal = Yaw (-100 to +100)
        const yaw = Math.round(normX * 100);
        // Vertical = Throttle (0 to 100) -> top (-1) is 100%, bottom (+1) is 0%
        const throttle = Math.max(0, Math.min(100, Math.round(((1 - normY) / 2) * 100)));
        onChange(throttle, yaw);
      } else {
        // Vertical = Pitch (-100 to +100) -> Up (-1) is forward (+pitch)
        let pitch = Math.round(-normY * 100);
        if (invertPitch) pitch = -pitch;
        // Horizontal = Roll (-100 to +100) -> Right is +roll
        const roll = Math.round(normX * 100);
        onChange(pitch, roll);
      }
    },
    [deadzone, invertPitch, isThrottleYaw, maxThumbDistance, onChange]
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || e.pointerId !== activePointerId.current) return;
    processPointerCoords(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    setIsDragging(false);
    activePointerId.current = null;

    if (isThrottleYaw) {
      if (springCenterVertical) {
        // Return throttle to 0 and yaw to 0
        onChange(0, 0);
      } else {
        // Keep current throttle, center yaw
        onChange(valueVertical, 0);
      }
    } else {
      // Pitch & Roll always return to center (0, 0)
      onChange(0, 0);
    }
  };

  return (
    <div className="flex flex-col items-center select-none touch-none">
      {/* Stick Header Information */}
      <div className="flex items-center justify-between w-full px-2 mb-1.5 text-[11px] font-mono tracking-wider">
        <span className="text-slate-400 font-semibold">{label}</span>
        <span className="text-sky-400 font-bold tabular-nums">
          {isThrottleYaw ? (
            <>
              THR <span className="text-emerald-400">{valueVertical}%</span> · YAW{' '}
              <span className={valueHorizontal !== 0 ? 'text-amber-400' : 'text-slate-400'}>
                {valueHorizontal > 0 ? `+${valueHorizontal}` : valueHorizontal}
              </span>
            </>
          ) : (
            <>
              PIT{' '}
              <span className={valueVertical !== 0 ? 'text-amber-400' : 'text-slate-400'}>
                {valueVertical > 0 ? `+${valueVertical}` : valueVertical}
              </span>{' '}
              · ROL{' '}
              <span className={valueHorizontal !== 0 ? 'text-amber-400' : 'text-slate-400'}>
                {valueHorizontal > 0 ? `+${valueHorizontal}` : valueHorizontal}
              </span>
            </>
          )}
        </span>
      </div>

      {/* Touch Gimbals Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`relative rounded-full cursor-crosshair transition-colors duration-200 ${
          isDragging
            ? 'bg-slate-900/90 shadow-[0_0_25px_rgba(56,189,248,0.25)] border-sky-400'
            : 'bg-slate-950/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] border-slate-700/80'
        } border-2 backdrop-blur-md overflow-hidden flex items-center justify-center`}
      >
        {/* Outer Circular Graduation Ticks */}
        <div className="absolute inset-2 rounded-full border border-sky-500/15 pointer-events-none" />
        <div className="absolute inset-7 rounded-full border border-dashed border-sky-500/10 pointer-events-none" />

        {/* Crosshair Axes */}
        <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-sky-500/30 to-transparent pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-sky-500/30 to-transparent pointer-events-none" />

        {/* Dynamic Axis Labels */}
        {isThrottleYaw ? (
          <>
            <span className="absolute top-2 text-[9px] font-mono text-slate-500 font-bold tracking-widest pointer-events-none">
              THR MAX
            </span>
            <span className="absolute bottom-2 text-[9px] font-mono text-slate-500 font-bold tracking-widest pointer-events-none">
              THR ZERO
            </span>
            <span className="absolute left-2.5 text-[9px] font-mono text-slate-500 pointer-events-none">
              YAW-L
            </span>
            <span className="absolute right-2.5 text-[9px] font-mono text-slate-500 pointer-events-none">
              YAW-R
            </span>
          </>
        ) : (
          <>
            <span className="absolute top-2 text-[9px] font-mono text-slate-500 font-bold tracking-widest pointer-events-none">
              NOSE DN
            </span>
            <span className="absolute bottom-2 text-[9px] font-mono text-slate-500 font-bold tracking-widest pointer-events-none">
              NOSE UP
            </span>
            <span className="absolute left-2.5 text-[9px] font-mono text-slate-500 pointer-events-none">
              ROL-L
            </span>
            <span className="absolute right-2.5 text-[9px] font-mono text-slate-500 pointer-events-none">
              ROL-R
            </span>
          </>
        )}

        {/* Thumb Pad */}
        <div
          style={{
            transform: `translate(${thumbPos.x}px, ${thumbPos.y}px)`,
            transition: isDragging ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className={`absolute w-14 h-14 rounded-full flex items-center justify-center pointer-events-none ${
            isDragging
              ? 'bg-gradient-to-b from-sky-400 to-sky-600 shadow-[0_0_15px_rgba(56,189,248,0.6)] scale-105'
              : 'bg-gradient-to-b from-slate-700 to-slate-800 shadow-md'
          } border border-sky-300/40`}
        >
          {/* Inner knurling / grip ridges */}
          <div className="w-10 h-10 rounded-full border border-sky-200/30 flex items-center justify-center bg-slate-900/40">
            <div className="w-4 h-4 rounded-full bg-white/80 shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
};
