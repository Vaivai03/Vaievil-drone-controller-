export interface JoystickState {
  throttle: number; // 0 to 100
  yaw: number;      // -100 to +100
  pitch: number;    // -100 to +100
  roll: number;     // -100 to +100
}

export interface DroneSettings {
  esp32Ip: string;
  esp32Port: number;
  connectionTimeoutMs: number;
  sendCommandFrequencyHz: number; // e.g. 20 Hz
  throttleSpringCenter: boolean;  // false = stays at position (friction), true = returns to 0
  invertPitch: boolean;
  deadzonePercent: number;        // e.g. 5%
  testMode: boolean;              // Simulates ESP32 without hardware
}

export type ArmState = 'DISARMED' | 'ARMING' | 'ARMED' | 'ESTOP';

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'TIMEOUT_FAILSAFE';

export interface DroneTelemetry {
  batteryPercent: number;
  batteryVoltage: number;
  rssiDbm: number;
  flightMode: 'MANUAL' | 'ALT_HOLD' | 'ACRO' | 'FAILSAFE';
  pitchAngle: number;
  rollAngle: number;
  heading: number;
  altitudeMeters: number;
  motorRpms: [number, number, number, number]; // M1, M2, M3, M4
  packetsReceived: number;
  packetsLost: number;
  lastHeartbeatTime: number;
}

export interface CommandLogEntry {
  id: string;
  timestamp: string;
  rawCommand: string;
  type: 'JOYSTICK' | 'ARM' | 'DISARM' | 'ESTOP' | 'PHOTO' | 'RECORD_START' | 'RECORD_STOP' | 'PING';
  status: 'SENT' | 'ACKNOWLEDGED' | 'DROPPED';
  roundTripMs?: number;
}
