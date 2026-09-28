import React, { useState } from 'react';
import { Code, Download, Copy, Check, FileCode, Folder, ExternalLink, X } from 'lucide-react';
import JSZip from 'jszip';
import { ANDROID_PROJECT_FILES, AndroidSourceFile } from '../data/androidProjectFiles';
import { ESP32_FIRMWARE_SKETCH } from '../data/esp32Firmware';
import { DRONE_DOCS } from '../data/droneDocs';

interface AndroidCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidCodeModal: React.FC<AndroidCodeModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<AndroidSourceFile>(ANDROID_PROJECT_FILES[4]); // MainActivity.kt by default
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'esp32' | 'instructions'>('android');

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy =
      activeTab === 'android'
        ? selectedFile.content
        : activeTab === 'esp32'
        ? ESP32_FIRMWARE_SKETCH
        : DRONE_DOCS.apkBuildGuide.content;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // 1. Add all Android project files
      const androidFolder = zip.folder('MyDroneController_Android');
      ANDROID_PROJECT_FILES.forEach((file) => {
        androidFolder?.file(file.path, file.content);
      });

      // 2. Add companion ESP32 firmware
      const espFolder = zip.folder('ESP32_Drone_Firmware');
      espFolder?.file('MyDrone_ESP32_Receiver.ino', ESP32_FIRMWARE_SKETCH);

      // 3. Add documentation
      zip.file('README.md', `# MyDrone Controller - Complete System\n\n${DRONE_DOCS.apkBuildGuide.content}\n\n${DRONE_DOCS.protocol.content}\n\n${DRONE_DOCS.architecture.content}`);
      zip.file('PROTOCOL.md', DRONE_DOCS.protocol.content);
      zip.file('BUILD_INSTRUCTIONS.md', DRONE_DOCS.apkBuildGuide.content);
      zip.file('IP_PORT_SETUP.md', DRONE_DOCS.ipPortConfig.content);

      // Generate zip and trigger download
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MyDroneController_Complete_Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl h-[88vh] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col font-mono text-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-sky-500/10 border border-sky-500/30 rounded text-sky-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                ANDROID KOTLIN + COMPOSE SOURCE & FIRMWARE
              </h2>
              <p className="text-[10px] text-slate-400">
                Complete, production-ready source files ready to build in Android Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'PACKING ZIP...' : 'DOWNLOAD PROJECT (.ZIP)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-slate-800 bg-slate-900/40 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('android')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'android'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Android Kotlin (Jetpack Compose)
            </button>
            <button
              onClick={() => setActiveTab('esp32')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'esp32'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ESP32 Arduino Sketch (.ino)
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'instructions'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              APK Build Guide & Specs
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'android' ? (
            <>
              {/* Left Sidebar: File Tree */}
              <div className="w-72 border-r border-slate-800 bg-slate-900/30 overflow-y-auto p-3 text-xs space-y-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 px-2">
                  Project Structure
                </div>
                {ANDROID_PROJECT_FILES.map((file) => {
                  const isSelected = selectedFile.path === file.path;
                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-2 rounded flex items-center gap-2 transition-colors ${
                        isSelected
                          ? 'bg-sky-950/80 text-sky-300 border border-sky-800/80 font-bold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                      <div className="overflow-hidden">
                        <p className="truncate text-[11px]">{file.name}</p>
                        <p className="truncate text-[9px] text-slate-500">{file.path}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Code Display */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
                <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">{selectedFile.path}</span>
                  <span className="text-[10px] text-slate-500">{selectedFile.description}</span>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <pre className="text-xs font-mono text-sky-200/90 leading-relaxed whitespace-pre select-text">
                    {selectedFile.content}
                  </pre>
                </div>
              </div>
            </>
          ) : activeTab === 'esp32' ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
              <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">MyDrone_ESP32_Receiver.ino</span>
                <span className="text-[10px] text-slate-500">
                  Flash to ESP32 using Arduino IDE or PlatformIO
                </span>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-xs font-mono text-emerald-200/90 leading-relaxed whitespace-pre select-text">
                  {ESP32_FIRMWARE_SKETCH}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-6 space-y-6 text-xs text-slate-300 max-w-4xl mx-auto">
              <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                <h3 className="text-sm font-bold text-sky-400">Quadcopter Communication Architecture</h3>
                <p className="text-slate-300 leading-relaxed">
                  PHONE → Wi-Fi (UDP) → ESP32 Access Point → Serial2 (MSP/CRSF) → Flight Controller → ESCs → Motors
                </p>
                <p className="text-slate-400 text-[11px]">
                  The phone communicates exclusively with the ESP32. The ESP32 manages flight controller setpoints and runs hardware safety watchdogs.
                </p>
              </div>

              <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-sky-400">Step-by-Step Instructions: Build & Install APK</h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                  <li>
                    Click <strong className="text-white">Download Project (.zip)</strong> above and unzip it to your computer.
                  </li>
                  <li>
                    Open <strong className="text-white">Android Studio</strong>, choose <strong className="text-white">Open</strong>, and select the unzipped <code className="text-sky-300">MyDroneController_Android</code> folder.
                  </li>
                  <li>
                    Wait 30 seconds for Gradle to sync. Connect your Android phone via USB with <strong className="text-white">USB Debugging</strong> enabled.
                  </li>
                  <li>
                    Click <strong className="text-emerald-400">Run (Play button)</strong> to install directly, or go to <strong className="text-white">Build → Build Bundle(s) / APK(s) → Build APK(s)</strong> to generate <code className="text-sky-300">app-debug.apk</code>.
                  </li>
                </ol>
              </div>

              <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-sky-400">How to Connect to Drone Wi-Fi</h3>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                  <li>Power on your drone with the ESP32 board.</li>
                  <li>On your Android phone, go to Wi-Fi settings and connect to <strong className="text-white">MyDrone-AP</strong> (Password: <code className="text-sky-300">flydrone123</code>).</li>
                  <li>If Android prompts &quot;This Wi-Fi network has no internet access. Stay connected?&quot;, tap <strong className="text-emerald-400">Stay Connected / Yes</strong>.</li>
                  <li>Open MyDrone Controller. The status indicator will turn green and read <strong className="text-emerald-400">CONNECTED</strong>!</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
