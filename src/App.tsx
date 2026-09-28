import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  BatteryCharging,
  BatteryMedium,
  BatteryLow,
  Shield,
  ShieldAlert,
  AlertOctagon,
  Settings,
  Terminal,
  Code,
  Camera,
  Layers,
  Radio,
  Maximize2,
  Minimize2,
  Compass,
  Activity,
  Sliders,
  Play,
  Square,
  HelpCircle,
} from 'lucide-react';
import { VirtualJoystick } from './components/VirtualJoystick';
import { HudArtificialHorizon } from './components/HudArtificialHorizon';
import { CameraView } from './components/CameraView';
import { ArmConfirmDialog } from './components/ArmConfirmDialog';
import { SettingsModal } from './components/SettingsModal';
import { CommandInspector } from './components/CommandInspector';
import { AndroidCodeModal } from './components/AndroidCodeModal';
import { MockEsp32Server } from './components/MockEsp32Server';
import {
  JoystickState,
  DroneSettings,
  DroneTelemetry,
  ArmState,
  ConnectionState,
  CommandLogEntry,
} from './types/drone';

export default function App() {
  // Joystick setpoints
  const [joystick, setJoystick] = useState<JoystickState>({
    throttle: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
  });

  // Settings
  const [settings, setSettings] = useState<DroneSettings>({
    esp32Ip: '192.168.4.1',
    esp32Port: 8888,
    connectionTimeoutMs: 1000,
    sendCommandFrequencyHz: 20,
    throttleSpringCenter: false,
    invertPitch: false,
    deadzonePercent: 5,
    testMode: true,
  });

  // Drone operational state
  const [armState, setArmState] = useState<ArmState>('DISARMED');
  const [connectionState, setConnectionState] = useState<ConnectionState>('CONNECTED');
  const [isRecording, setIsRecording] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [lastPhotoTime, setLastPhotoTime] = useState<string | undefined>(undefined);
  const [simulateSignalLoss, setSimulateSignalLoss] = useState(false);

  // Center display mode: HUD telemetry vs Camera interface
  const [centerMode, setCenterMode] = useState<'hud' | 'camera'>('hud');

  // Modals
  const [isArmDialogOpen, setIsArmDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isAndroidCodeOpen, setIsAndroidCodeOpen] = useState(false);

  // Command logs & active telemetry
  const [commandLog, setCommandLog] = useState<CommandLogEntry[]>([]);
  const [lastRawCommand, setLastRawCommand] = useState<string>('THROTTLE=0;YAW=0;PITCH=0;ROLL=0');

  // In-browser virtual hardware engine
  const mockServerRef = useRef<MockEsp32Server>(new MockEsp32Server());
  const [telemetry, setTelemetry] = useState<DroneTelemetry>(() =>
    mockServerRef.current.getTelemetry()
  );

  const lastSendTimeRef = useRef<number>(Date.now());
  const lastHeartbeatTimeRef = useRef<number>(Date.now());

  // Log an entry to the command packet history
  const addLogEntry = useCallback(
    (
      rawCommand: string,
      type: CommandLogEntry['type'],
      status: CommandLogEntry['status'],
      roundTripMs?: number
    ) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now
        .getMilliseconds()
        .toString()
        .padStart(3, '0')}`;

      const entry: CommandLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timeStr,
        rawCommand,
        type,
        status,
        roundTripMs,
      };

      setCommandLog((prev) => [entry, ...prev].slice(0, 100));
    },
    []
  );

  // Execute or dispatch a drone command (Mock engine or real UDP/fetch bridge)
  const dispatchCommand = useCallback(
    (commandString: string, type: CommandLogEntry['type']) => {
      setLastRawCommand(commandString);
      const startTime = performance.now();

      if (settings.testMode) {
        // Send to Virtual ESP32 Hardware Engine
        const res = mockServerRef.current.processCommand(commandString);
        const rtt = Math.round(performance.now() - startTime);

        if (res.success && res.responseTelemetry) {
          setTelemetry(res.responseTelemetry);
          lastHeartbeatTimeRef.current = Date.now();
          setConnectionState('CONNECTED');
          addLogEntry(commandString, type, 'ACKNOWLEDGED', rtt);
        } else {
          // Packet dropped or signal loss simulated
          addLogEntry(commandString, type, 'DROPPED', rtt);
        }
      } else {
        // Real hardware mode: If user enters an HTTP/WebSocket proxy or runs native Android
        addLogEntry(commandString, type, 'SENT');
      }
    },
    [addLogEntry, settings.testMode]
  );

  // High-frequency command transmission loop
  useEffect(() => {
    const intervalMs = Math.max(20, Math.round(1000 / settings.sendCommandFrequencyHz));

    const interval = setInterval(() => {
      // If signal loss is simulated in test mode, check watchdog
      if (settings.testMode && simulateSignalLoss) {
        const timeoutReached = mockServerRef.current.checkWatchdog(settings.connectionTimeoutMs);
        if (timeoutReached) {
          setConnectionState('TIMEOUT_FAILSAFE');
          setArmState('DISARMED');
          setJoystick((prev) => ({ ...prev, throttle: 0 }));
          return;
        }
      }

      // Format standard movement packet: THROTTLE=x;YAW=y;PITCH=z;ROLL=w
      const movementCmd = `THROTTLE=${joystick.throttle};YAW=${joystick.yaw};PITCH=${joystick.pitch};ROLL=${joystick.roll}`;
      dispatchCommand(movementCmd, 'JOYSTICK');
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    joystick.throttle,
    joystick.yaw,
    joystick.pitch,
    joystick.roll,
    settings.sendCommandFrequencyHz,
    settings.connectionTimeoutMs,
    settings.testMode,
    simulateSignalLoss,
    dispatchCommand,
  ]);

  // Connection Watchdog
  useEffect(() => {
    const watchdog = setInterval(() => {
      const elapsed = Date.now() - lastHeartbeatTimeRef.current;
      if (elapsed > settings.connectionTimeoutMs && connectionState === 'CONNECTED' && simulateSignalLoss) {
        setConnectionState('TIMEOUT_FAILSAFE');
        setArmState('DISARMED');
        setJoystick((prev) => ({ ...prev, throttle: 0 }));
      }
    }, 200);

    return () => clearInterval(watchdog);
  }, [connectionState, settings.connectionTimeoutMs, simulateSignalLoss]);

  // Handlers for joysticks
  const handleLeftJoystick = (throttleVal: number, yawVal: number) => {
    setJoystick((prev) => ({
      ...prev,
      throttle: throttleVal,
      yaw: yawVal,
    }));
  };

  const handleRightJoystick = (pitchVal: number, rollVal: number) => {
    setJoystick((prev) => ({
      ...prev,
      pitch: pitchVal,
      roll: rollVal,
    }));
  };

  // Safety Arming Handlers
  const handleArmRequest = () => {
    if (joystick.throttle > 5) {
      alert('SAFETY LOCK: Throttle must be at 0% to ARM!');
      return;
    }
    setIsArmDialogOpen(true);
  };

  const handleArmConfirm = () => {
    setIsArmDialogOpen(false);
    setArmState('ARMED');
    dispatchCommand('ARM', 'ARM');
  };

  const handleDisarm = () => {
    setArmState('DISARMED');
    setJoystick((prev) => ({ ...prev, throttle: 0 }));
    dispatchCommand('DISARM', 'DISARM');
  };

  // Prominent EMERGENCY STOP: Kills motors instantly, resets all axes to 0
  const handleEmergencyStop = () => {
    setArmState('ESTOP');
    setJoystick({
      throttle: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
    });
    dispatchCommand('ESTOP', 'ESTOP');
  };

  // Camera Actions
  const handleTakePhoto = () => {
    dispatchCommand('PHOTO', 'PHOTO');
    setPhotoCount((prev) => prev + 1);
    setLastPhotoTime(new Date().toLocaleTimeString());
  };

  const handleToggleRecording = () => {
    const nextState = !isRecording;
    setIsRecording(nextState);
    dispatchCommand(nextState ? 'RECORD_START' : 'RECORD_STOP', nextState ? 'RECORD_START' : 'RECORD_STOP');
  };

  // Toggle simulated signal loss
  const handleToggleSignalLoss = (lost: boolean) => {
    setSimulateSignalLoss(lost);
    mockServerRef.current.setSimulateSignalLoss(lost);
    if (!lost) {
      lastHeartbeatTimeRef.current = Date.now();
      setConnectionState('CONNECTED');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP BAR CONTRACT */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <span className="font-bold text-sm tracking-tight text-white font-mono uppercase">
            MyDrone Controller
          </span>
        </div>

        {/* Zone 2: Navigation Links / Views */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400 font-mono">
          <button
            onClick={() => setCenterMode('hud')}
            className={`transition-colors hover:text-white ${
              centerMode === 'hud' ? 'text-sky-400 font-bold' : ''
            }`}
          >
            Flight Cockpit
          </button>
          <button
            onClick={() => setCenterMode('camera')}
            className={`transition-colors hover:text-white ${
              centerMode === 'camera' ? 'text-sky-400 font-bold' : ''
            }`}
          >
            Camera Bay {isRecording && <span className="text-rose-400 animate-pulse">● REC</span>}
          </button>
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="transition-colors hover:text-white flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>Packet Inspector</span>
          </button>
          <button
            onClick={() => setIsAndroidCodeOpen(true)}
            className="transition-colors hover:text-white flex items-center gap-1.5"
          >
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            <span>Android Kotlin Source</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {settings.testMode && (
            <span className="hidden sm:inline-flex text-[11px] text-indigo-400 bg-indigo-950/70 border border-indigo-800/80 px-2 py-0.5 rounded">
              Test Mode
            </span>
          )}

          <button
            onClick={() => setIsAndroidCodeOpen(true)}
            className="md:hidden flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-xs"
          >
            <Code className="w-3.5 h-3.5" />
            <span>APK/Code</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Configure Drone & Network"
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </header>

      {/* 2. DRONE TELEMETRY RIBBON */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between text-xs font-mono shrink-0 gap-y-2">
        {/* Connection & ESP32 IP */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {connectionState === 'CONNECTED' ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi className="w-3.5 h-3.5" />
                <span>CONNECTED</span>
              </span>
            ) : connectionState === 'TIMEOUT_FAILSAFE' ? (
              <span className="flex items-center gap-1.5 text-rose-400 font-bold animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
                <span>SIGNAL LOST (FAILSAFE)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400">
                <WifiOff className="w-3.5 h-3.5" />
                <span>DISCONNECTED</span>
              </span>
            )}
          </div>

          <span className="text-slate-600">|</span>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">ESP32:</span>
            <span className="text-white font-bold">{settings.esp32Ip}:{settings.esp32Port}</span>
          </div>

          <span className="hidden sm:inline text-slate-600">|</span>

          <div className="hidden sm:flex items-center gap-1 text-slate-400">
            <span>RSSI:</span>
            <span className="text-sky-400 font-bold tabular-nums">{telemetry.rssiDbm} dBm</span>
          </div>
        </div>

        {/* Battery & Flight Mode Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {telemetry.batteryPercent > 50 ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
            ) : telemetry.batteryPercent > 20 ? (
              <BatteryMedium className="w-4 h-4 text-amber-400" />
            ) : (
              <BatteryLow className="w-4 h-4 text-rose-500 animate-pulse" />
            )}
            <span className="text-slate-400">BAT:</span>
            <span
              className={`font-bold tabular-nums ${
                telemetry.batteryPercent < 25 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {telemetry.batteryPercent}% ({telemetry.batteryVoltage.toFixed(1)}V)
            </span>
          </div>

          <span className="text-slate-600">|</span>

          {/* Arm Status Indicator */}
          <div className="flex items-center gap-1.5">
            {armState === 'ARMED' ? (
              <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-600 text-rose-300 font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(225,29,72,0.4)]">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>ARMED (MOTORS LIVE)</span>
              </span>
            ) : armState === 'ESTOP' ? (
              <span className="px-2 py-0.5 rounded bg-rose-900 border border-rose-500 text-white font-black animate-pulse">
                ESTOP ACTIVATED
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                DISARMED
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN COCKPIT VIEWPORT (DUAL JOYSTICKS + CENTER FLIGHT HUB) */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-between p-3 md:p-6 overflow-hidden gap-4">
        {/* LEFT COLUMN: THROTTLE & YAW GIMBAL */}
        <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-auto">
          <VirtualJoystick
            label="LEFT GIMBAL"
            isThrottleYaw={true}
            springCenterVertical={settings.throttleSpringCenter}
            deadzone={settings.deadzonePercent}
            valueVertical={joystick.throttle}
            valueHorizontal={joystick.yaw}
            onChange={handleLeftJoystick}
            size={180}
          />
          <div className="mt-2 text-[10px] font-mono text-slate-500 text-center">
            Mode 2: Throttle (0..100) · Yaw (-100..+100)
          </div>
        </div>

        {/* CENTER COLUMN: HUD / CAMERA & SAFETY CONTROL PANEL */}
        <div className="flex-1 flex flex-col h-full max-w-xl w-full justify-between items-center gap-3">
          {/* Top Mode Segmented Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono">
            <button
              onClick={() => setCenterMode('hud')}
              className={`px-3 py-1 rounded transition-colors ${
                centerMode === 'hud'
                  ? 'bg-sky-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Flight Instrument HUD
            </button>
            <button
              onClick={() => setCenterMode('camera')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                centerMode === 'camera'
                  ? 'bg-sky-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Bay</span>
              {isRecording && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
            </button>
          </div>

          {/* Center Instrument Display Screen */}
          <div className="w-full flex-1 max-h-[260px] bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-hidden shadow-inner flex items-center justify-center">
            {centerMode === 'hud' ? (
              <HudArtificialHorizon
                telemetry={telemetry}
                armState={armState}
                throttle={joystick.throttle}
              />
            ) : (
              <CameraView
                isRecording={isRecording}
                photoCount={photoCount}
                onTakePhoto={handleTakePhoto}
                onToggleRecording={handleToggleRecording}
                lastPhotoTime={lastPhotoTime}
              />
            )}
          </div>

          {/* Center Safety Action Panel */}
          <div className="w-full space-y-2">
            {/* Prominent EMERGENCY STOP Button */}
            <button
              onClick={handleEmergencyStop}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-600 text-white font-black text-sm tracking-wider uppercase rounded-xl border border-rose-400/50 shadow-[0_0_25px_rgba(225,29,72,0.4)] flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer font-mono"
            >
              <AlertOctagon className="w-5 h-5 animate-pulse" />
              <span>EMERGENCY STOP (ESTOP)</span>
            </button>

            {/* ARM / DISARM & CAMERA QUICK BUTTONS */}
            <div className="grid grid-cols-2 gap-2 font-mono">
              {/* ARM Button */}
              <button
                onClick={handleArmRequest}
                disabled={armState === 'ARMED'}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  armState === 'ARMED'
                    ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 active:scale-95 cursor-pointer'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>ARM MOTORS</span>
              </button>

              {/* DISARM Button */}
              <button
                onClick={handleDisarm}
                disabled={armState === 'DISARMED'}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  armState === 'DISARMED'
                    ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950 active:scale-95 cursor-pointer'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>DISARM</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PITCH & ROLL GIMBAL */}
        <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-auto">
          <VirtualJoystick
            label="RIGHT GIMBAL"
            isThrottleYaw={false}
            invertPitch={settings.invertPitch}
            deadzone={settings.deadzonePercent}
            valueVertical={joystick.pitch}
            valueHorizontal={joystick.roll}
            onChange={handleRightJoystick}
            size={180}
          />
          <div className="mt-2 text-[10px] font-mono text-slate-500 text-center">
            Cyclic: Pitch (-100..+100) · Roll (-100..+100)
          </div>
        </div>
      </main>

      {/* 4. FOOTER: TELEMETRY & COMMAND STREAM INSPECTOR */}
      <footer className="h-9 bg-slate-950 border-t border-slate-800/80 px-4 flex items-center justify-between text-[11px] font-mono shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-sky-500 font-bold shrink-0">TX PACKET:</span>
          <code className="text-emerald-400 font-bold truncate">{lastRawCommand}</code>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-slate-500 hidden sm:inline">
            Rate: {settings.sendCommandFrequencyHz} Hz ({Math.round(1000 / settings.sendCommandFrequencyHz)}ms)
          </span>
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="text-sky-400 hover:text-sky-300 flex items-center gap-1 text-[11px] underline"
          >
            <Terminal className="w-3 h-3" />
            <span>Open Inspector</span>
          </button>
        </div>
      </footer>

      {/* 5. MODAL DIALOGS */}
      {/* Arm Safety Confirmation Dialog */}
      <ArmConfirmDialog
        isOpen={isArmDialogOpen}
        throttle={joystick.throttle}
        onConfirm={handleArmConfirm}
        onCancel={() => setIsArmDialogOpen(false)}
      />

      {/* Settings Screen */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        simulateSignalLoss={simulateSignalLoss}
        onSave={(newSettings) => setSettings(newSettings)}
        onToggleSignalLoss={handleToggleSignalLoss}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Command Packet Inspector (Test Mode) */}
      <CommandInspector
        isOpen={isInspectorOpen}
        log={commandLog}
        lastRawCommand={lastRawCommand}
        onClose={() => setIsInspectorOpen(false)}
        onClearLog={() => setCommandLog([])}
        onInjectCommand={(cmd) => dispatchCommand(cmd, 'JOYSTICK')}
      />

      {/* Android Kotlin Project Source & APK Guide */}
      <AndroidCodeModal
        isOpen={isAndroidCodeOpen}
        onClose={() => setIsAndroidCodeOpen(false)}
      />
    </div>
  );
}
