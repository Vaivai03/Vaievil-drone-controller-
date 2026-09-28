import React, { useState, useEffect } from 'react';
import { Camera, Disc3, Video, VideoOff, Check, Image as ImageIcon } from 'lucide-react';

interface CameraViewProps {
  isRecording: boolean;
  photoCount: number;
  onTakePhoto: () => void;
  onToggleRecording: () => void;
  lastPhotoTime?: string;
}

export const CameraView: React.FC<CameraViewProps> = ({
  isRecording,
  photoCount,
  onTakePhoto,
  onToggleRecording,
  lastPhotoTime,
}) => {
  const [shutterFlash, setShutterFlash] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Trigger white screen flash on photo capture
  const handlePhotoClick = () => {
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);
    onTakePhoto();
  };

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-3 bg-slate-950/80 rounded-lg border border-slate-800 overflow-hidden font-mono select-none">
      {/* Shutter Flash Animation */}
      {shutterFlash && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />
      )}

      {/* Camera Viewport Framing (Modular Placeholder) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
        {/* Aspect Ratio Framing Guides */}
        <div className="absolute inset-4 border border-dashed border-slate-700/50 rounded pointer-events-none">
          {/* Corner tick marks */}
          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-sky-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-sky-400" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-sky-400" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-sky-400" />
        </div>

        {/* Center Crosshair */}
        <div className="w-8 h-8 rounded-full border border-sky-500/20 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500/40" />
        </div>

        {/* Explicit Honest Status (Per requirements: Do not pretend video works until camera module connected) */}
        <div className="mt-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded max-w-xs backdrop-blur-md">
          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-semibold mb-0.5">
            <VideoOff className="w-3.5 h-3.5" />
            <span>VIDEO STREAM OFFLINE</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Modular payload bay ready for ESP32-CAM (RTSP / MJPEG) or 5.8GHz FPV receiver.
          </p>
        </div>
      </div>

      {/* Top Recording & Shutter Status Bar */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-500/50 text-rose-300 px-2.5 py-1 rounded text-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="font-bold">REC {formatTimer(recordSeconds)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500 text-xs px-2 py-0.5">
              <Disc3 className="w-3.5 h-3.5" />
              <span>STANDBY</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-white font-bold tabular-nums">{photoCount}</span>
            <span className="text-slate-500">snaps</span>
          </div>
        </div>
      </div>

      {/* Bottom Camera Action Controls */}
      <div className="relative z-10 flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        {/* Take Photo Button */}
        <button
          onClick={handlePhotoClick}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-sky-500/40 rounded-lg text-sky-300 text-xs font-semibold transition-all shadow-sm"
        >
          <Camera className="w-4 h-4 text-sky-400" />
          <span>TAKE PHOTO</span>
        </button>

        {/* Start / Stop Recording Button */}
        <button
          onClick={onToggleRecording}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm ${
            isRecording
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
              : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200'
          }`}
        >
          <span
            className={`w-3 h-3 rounded-full ${
              isRecording ? 'bg-white' : 'bg-rose-500'
            }`}
          />
          <span>{isRecording ? 'STOP RECORDING' : 'START RECORDING'}</span>
        </button>
      </div>
    </div>
  );
};
