import { DroneTelemetry, JoystickState } from '../types/drone';

export class MockEsp32Server {
  private isArmed = false;
  private isRecording = false;
  private photoCount = 0;
  private batteryPercent = 94;
  private batteryVoltage = 12.4;
  private altitude = 0;
  private pitch = 0;
  private roll = 0;
  private heading = 180;
  private lastPacketTime = Date.now();
  private simulateSignalLoss = false;
  private failsafeTriggered = false;

  private motorRpms: [number, number, number, number] = [0, 0, 0, 0];

  public processCommand(rawCommand: string): { success: boolean; responseTelemetry?: DroneTelemetry; logMessage: string } {
    if (this.simulateSignalLoss) {
      return { success: false, logMessage: 'PACKET_DROPPED (Signal lost)' };
    }

    this.lastPacketTime = Date.now();
    this.failsafeTriggered = false;
    const cmd = rawCommand.trim();

    if (cmd === 'ARM') {
      this.isArmed = true;
      this.motorRpms = [1200, 1200, 1200, 1200]; // Idle spin
      return {
        success: true,
        responseTelemetry: this.getTelemetry(),
        logMessage: 'ESP32 ACK: DRONE ARMED (Motors idle at 1200 RPM)'
      };
    }

    if (cmd === 'DISARM') {
      this.isArmed = false;
      this.motorRpms = [0, 0, 0, 0];
      return {
        success: true,
        responseTelemetry: this.getTelemetry(),
        logMessage: 'ESP32 ACK: DRONE DISARMED (Motors 0 RPM)'
      };
    }

    if (cmd === 'ESTOP') {
      this.isArmed = false;
      this.motorRpms = [0, 0, 0, 0];
      this.altitude = Math.max(0, this.altitude - 1);
      return {
        success: true,
        responseTelemetry: this.getTelemetry(),
        logMessage: 'ESP32 ACK: EMERGENCY STOP FIRED (All outputs killed)'
      };
    }

    if (cmd === 'PHOTO') {
      this.photoCount++;
      return {
        success: true,
        responseTelemetry: this.getTelemetry(),
        logMessage: `ESP32 ACK: Camera shutter fired (#${this.photoCount})`
      };
    }

    if (cmd === 'RECORD_START') {
      this.isRecording = true;
      return {
        success: true,
        responseTelemetry: this.getTelemetry(),
        logMessage: 'ESP32 ACK: Video recording started'
      };
    }

    if (cmd === 'RECORD_STOP') {
      this.isRecording = false;
      return {
        success: true,
        responseTelemetry: this.getTelemetry(),
        logMessage: 'ESP32 ACK: Video recording saved'
      };
    }

    // Parse Movement Command: THROTTLE=x;YAW=y;PITCH=z;ROLL=w
    if (cmd.startsWith('THROTTLE=')) {
      const parts = cmd.split(';');
      let t = 0, y = 0, p = 0, r = 0;
      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k === 'THROTTLE') t = parseInt(v, 10) || 0;
        if (k === 'YAW') y = parseInt(v, 10) || 0;
        if (k === 'PITCH') p = parseInt(v, 10) || 0;
        if (k === 'ROLL') r = parseInt(v, 10) || 0;
      }

      this.updatePhysics(t, y, p, r);

      return {
        success: true,
        responseTelemetry: this.getTelemetry(),
        logMessage: `ESP32 ACK: T=${t} Y=${y} P=${p} R=${r}`
      };
    }

    return {
      success: true,
      responseTelemetry: this.getTelemetry(),
      logMessage: `ESP32 ACK: Received ${cmd}`
    };
  }

  private updatePhysics(t: number, y: number, p: number, r: number) {
    if (!this.isArmed) {
      this.motorRpms = [0, 0, 0, 0];
      this.altitude = 0;
      this.pitch = 0;
      this.roll = 0;
      return;
    }

    // Drone quadcopter X-configuration mixer:
    // M1: Front-Right (CCW) -> T - P - R + Y
    // M2: Rear-Right (CW)   -> T + P - R - Y
    // M3: Rear-Left (CCW)   -> T + P + R + Y
    // M4: Front-Left (CW)   -> T - P + R - Y
    const baseRpm = 1000 + t * 90; // 1000 to 10000 RPM
    const m1 = Math.max(0, Math.min(11000, Math.round(baseRpm - p * 15 - r * 15 + y * 10)));
    const m2 = Math.max(0, Math.min(11000, Math.round(baseRpm + p * 15 - r * 15 - y * 10)));
    const m3 = Math.max(0, Math.min(11000, Math.round(baseRpm + p * 15 + r * 15 + y * 10)));
    const m4 = Math.max(0, Math.min(11000, Math.round(baseRpm - p * 15 + r * 15 - y * 10)));

    this.motorRpms = [m1, m2, m3, m4];

    // Smooth tilt angles
    this.pitch = Math.round(p * 0.35); // max ~35 deg tilt
    this.roll = Math.round(r * 0.35);
    this.heading = (this.heading + Math.round(y * 0.1) + 360) % 360;

    // Altitude simulation
    if (t > 45) {
      this.altitude = Math.min(120, +(this.altitude + (t - 45) * 0.04).toFixed(1));
    } else if (t < 40 && this.altitude > 0) {
      this.altitude = Math.max(0, +(this.altitude - (40 - t) * 0.03).toFixed(1));
    }

    // Slow battery drain
    if (t > 10) {
      this.batteryPercent = Math.max(5, +(this.batteryPercent - 0.015).toFixed(2));
      this.batteryVoltage = +(10.8 + (this.batteryPercent / 100) * 1.8).toFixed(2);
    }
  }

  public getTelemetry(): DroneTelemetry {
    return {
      batteryPercent: Math.round(this.batteryPercent),
      batteryVoltage: this.batteryVoltage,
      rssiDbm: this.simulateSignalLoss ? -99 : -52 - Math.floor(Math.random() * 8),
      flightMode: !this.isArmed ? 'MANUAL' : (this.failsafeTriggered ? 'FAILSAFE' : 'ALT_HOLD'),
      pitchAngle: this.pitch,
      rollAngle: this.roll,
      heading: this.heading,
      altitudeMeters: this.altitude,
      motorRpms: this.motorRpms,
      packetsReceived: 100,
      packetsLost: this.simulateSignalLoss ? 1 : 0,
      lastHeartbeatTime: this.lastPacketTime
    };
  }

  public setSimulateSignalLoss(lost: boolean) {
    this.simulateSignalLoss = lost;
  }

  public getSimulateSignalLoss(): boolean {
    return this.simulateSignalLoss;
  }

  public checkWatchdog(timeoutMs: number): boolean {
    if (Date.now() - this.lastPacketTime > timeoutMs) {
      this.failsafeTriggered = true;
      this.isArmed = false;
      this.motorRpms = [0, 0, 0, 0];
      return true;
    }
    return false;
  }
}
