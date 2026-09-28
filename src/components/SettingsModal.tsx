import React, { useState } from 'react';
import { Settings, X, Save, RefreshCw, Radio, Shield, HelpCircle } from 'lucide-react';
import { DroneSettings } from '../types/drone';

interface SettingsModalProps {
  isOpen: boolean;
  settings: DroneSettings;
  simulateSignalLoss: boolean;
  onSave: (newSettings: DroneSettings) => void;
  onToggleSignalLoss: (lost: boolean) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  simulateSignalLoss,
  onSave,
  onToggleSignalLoss,
  onClose,
}) => {
  const [form, setForm] = useState<DroneSettings>({ ...settings });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  const handleResetDefaults = () => {
    setForm({
      esp32Ip: '192.168.4.1',
      esp32Port: 8888,
      connectionTimeoutMs: 1000,
      sendCommandFrequencyHz: 20,
      throttleSpringCenter: false,
      invertPitch: false,
      deadzonePercent: 5,
      testMode: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold tracking-wide text-white">DRONE & ESP32 CONFIGURATION</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5 text-xs flex-1">
          {/* Section: Wi-Fi & ESP32 Network */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                ESP32 Direct Wi-Fi Access Point
              </span>
              <span className="text-[10px] text-slate-500">AP Mode (No Router Required)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  ESP32 IP Address
                </label>
                <input
                  type="text"
                  value={form.esp32Ip}
                  onChange={(e) => setForm({ ...form, esp32Ip: e.target.value })}
                  placeholder="192.168.4.1"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Default ESP32 AP: 192.168.4.1</span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  ESP32 UDP Port
                </label>
                <input
                  type="number"
                  value={form.esp32Port}
                  onChange={(e) => setForm({ ...form, esp32Port: parseInt(e.target.value, 10) || 8888 })}
                  placeholder="8888"
                  required
                  min={1024}
                  max={65535}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">UDP Datagram listening port</span>
              </div>
            </div>
          </div>

          {/* Section: Timing & Safety Watchdog */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Timing & Failsafe Watchdog
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  Command Frequency (Hz)
                </label>
                <input
                  type="number"
                  value={form.sendCommandFrequencyHz}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sendCommandFrequencyHz: Math.max(5, Math.min(50, parseInt(e.target.value, 10) || 20)),
                    })
                  }
                  min={5}
                  max={50}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {Math.round(1000 / form.sendCommandFrequencyHz)}ms interval (10 to 50 Hz recommended)
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                  Connection Timeout (ms)
                </label>
                <input
                  type="number"
                  value={form.connectionTimeoutMs}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      connectionTimeoutMs: Math.max(200, Math.min(5000, parseInt(e.target.value, 10) || 1000)),
                    })
                  }
                  min={200}
                  max={5000}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Cuts motors & triggers failsafe if no ping for {form.connectionTimeoutMs}ms
                </span>
              </div>
            </div>
          </div>

          {/* Section: Joystick Ergonomics */}
          <div className="space-y-3">
            <div className="pb-1 border-b border-slate-800">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                Gimbal & Stick Ergonomics
              </span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-200">Throttle Friction Hold (Mode 2)</span>
                  <span className="block text-[10px] text-slate-500">
                    Stick maintains throttle position when released (Recommended for quads)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={!form.throttleSpringCenter}
                  onChange={(e) => setForm({ ...form, throttleSpringCenter: !e.target.checked })}
                  className="w-4 h-4 accent-sky-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-200">Invert Pitch Axis</span>
                  <span className="block text-[10px] text-slate-500">
                    Forward = Nose Down (standard aviation convention)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={form.invertPitch}
                  onChange={(e) => setForm({ ...form, invertPitch: e.target.checked })}
                  className="w-4 h-4 accent-sky-500"
                />
              </label>

              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200">Stick Center Deadzone</span>
                  <span className="text-sky-400 font-bold tabular-nums">{form.deadzonePercent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={form.deadzonePercent}
                  onChange={(e) => setForm({ ...form, deadzonePercent: parseInt(e.target.value, 10) || 5 })}
                  className="w-full accent-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Test Mode & Diagnostic Tools */}
          <div className="p-3 bg-indigo-950/30 border border-indigo-500/40 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-indigo-300">Software Test Mode (Virtual Drone)</span>
                <p className="text-[10px] text-indigo-200">
                  Allows full testing of UI, joysticks, and command packets without connecting to physical hardware.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.testMode}
                onChange={(e) => setForm({ ...form, testMode: e.target.checked })}
                className="w-5 h-5 accent-indigo-500"
              />
            </div>

            {form.testMode && (
              <div className="pt-2 border-t border-indigo-900/60 flex items-center justify-between">
                <div>
                  <span className="text-amber-300 font-semibold text-[11px]">Simulate Wi-Fi Connection Loss</span>
                  <span className="block text-[10px] text-slate-400">
                    Drop mock packets to observe emergency failsafe triggers
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleSignalLoss(!simulateSignalLoss)}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition-colors ${
                    simulateSignalLoss
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {simulateSignalLoss ? 'SIGNAL LOST (TESTING FAILSAFE)' : 'SIMULATE DROP'}
                </button>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1 text-[11px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white bg-slate-900 rounded-lg border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg shadow-lg shadow-sky-900/40"
              >
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
