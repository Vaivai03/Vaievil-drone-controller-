export const DRONE_DOCS = {
  architecture: {
    title: 'Quadcopter Architecture & Data Flow',
    content: `
# MyDrone Controller - Quadcopter Architecture

This system uses a strict decoupled safety hierarchy:
\`\`\`
[ Android Smartphone ]
         │
         │  Wi-Fi (UDP 8888, 20Hz)
         ▼
[ ESP32 Microcontroller (Wi-Fi AP) ]
         │
         │  UART Serial2 (GPIO 16/17 @ 115200 baud)
         ▼
[ Flight Controller (FC: Betaflight/INAV/ArduPilot) ]
         │
         │  DShot / PWM Motor Signals
         ▼
[ Electronic Speed Controllers (ESCs) ]
         │
         │  3-Phase High Current
         ▼
[ Brushless Drone Motors ]
\`\`\`

### Why This Architecture?
1. **Safety Isolation**: The phone never directly controls motor timings or PID control loops. The Flight Controller with its onboard gyro/accelerometer runs the microsecond stabilization loop (1kHz - 8kHz).
2. **Deterministic Failsafe**: If the phone drops Wi-Fi or runs low on battery, the ESP32 watchdog detects packet loss within 500ms and asserts hardware failsafe to the Flight Controller.
3. **No Internet Needed**: The ESP32 hosts its own Wi-Fi Access Point (192.168.4.1), meaning you can fly in open fields, forests, or parks with zero cellular signal.
`
  },
  protocol: {
    title: 'Communication Protocol Specification',
    content: `
# MyDrone UDP Communication Protocol

### Transport Layer
- **Protocol**: UDP (User Datagram Protocol)
- **Default IP**: 192.168.4.1
- **Default Port**: 8888
- **Frequency**: Configurable 10Hz to 50Hz (Default 20Hz = 50ms per packet)

### Commands Sent by Android (Phone -> ESP32)

1. **Continuous Joystick Control**:
   \`THROTTLE=50;YAW=0;PITCH=10;ROLL=-5\`
   - \`THROTTLE\`: Integer [0 to 100] (0 = motor stop/idle, 100 = full throttle)
   - \`YAW\`: Integer [-100 to +100] (-100 = full left yaw, +100 = full right yaw)
   - \`PITCH\`: Integer [-100 to +100] (-100 = nose down/forward, +100 = nose up/backward)
   - \`ROLL\`: Integer [-100 to +100] (-100 = roll left, +100 = roll right)

2. **Arming Control**:
   - Command: \`ARM\`
   - Condition: Phone checks that \`THROTTLE <= 5%\` before dispatching. Requires user confirmation dialog.
   
3. **Disarming Control**:
   - Command: \`DISARM\`
   - Action: ESP32 instantly commands Flight Controller to cut motors. Immediately accessible.

4. **Emergency Stop**:
   - Command: \`ESTOP\`
   - Action: Prominent urgent kill switch. Disarms drone and zeros all flight registers.

5. **Camera Module**:
   - \`PHOTO\`: Triggers single snapshot
   - \`RECORD_START\`: Begins video recording
   - \`RECORD_STOP\`: Terminates and saves video recording

6. **Heartbeat**:
   - \`PING\`: Sent when joystick values are static to ensure connection liveness.

### Telemetry Replied by ESP32 (ESP32 -> Phone)
- Format: \`BAT=85;RSSI=-58;ARMED=1;FAILSAFE=0\`
- \`BAT\`: Battery percentage (0-100)
- \`RSSI\`: Wi-Fi signal strength in dBm
- \`ARMED\`: 1 if armed, 0 if disarmed
- \`FAILSAFE\`: 1 if failsafe is currently active
`
  },
  apkBuildGuide: {
    title: 'Building & Installing the Android APK',
    content: `
# Step-by-Step Instructions: Build & Install APK

### Prerequisites:
1. **Android Studio** (Hedgehog, Iguana, Koala, or Ladybug with JDK 17)
2. **Android Phone** running Android 7.0 (API 24) or higher

### Steps:
1. **Download Project Files**:
   - Click "Download Android Studio Project (.zip)" in this web app.
   - Extract the ZIP file to a folder on your computer (e.g. \`~/AndroidStudioProjects/MyDroneController\`).

2. **Open in Android Studio**:
   - Open Android Studio -> Click **Open** -> Select the extracted folder.
   - Wait for Gradle sync to complete (it will automatically download the Compose BOM and AndroidX libraries).

3. **Enable Developer Options on Android Phone**:
   - Go to Phone Settings -> About Phone -> Tap **Build Number** 7 times.
   - Go to Settings -> Developer Options -> Enable **USB Debugging**.

4. **Connect Phone & Run**:
   - Plug phone into PC via USB cable.
   - Select your phone in Android Studio's device dropdown.
   - Click the green **Run (Play)** button (or press \`Shift + F10\`).

5. **Building a Standalone APK**:
   - In Android Studio menu: **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
   - Once completed, click **locate** in the popup to get \`app-debug.apk\`.
   - Transfer \`app-debug.apk\` to your phone and tap it to install!
`
  },
  ipPortConfig: {
    title: 'Instructions for Changing ESP32 IP & Port',
    content: `
# How to Configure ESP32 IP & Port

### In the Android App:
1. Tap the **Settings** (gear icon) in the top right corner.
2. Enter your custom **ESP32 IP Address** (e.g., \`192.168.4.1\`).
3. Enter your custom **UDP Port** (e.g., \`8888\`).
4. Set your preferred **Send Frequency** (recommended: \`20Hz\` = 50ms refresh).
5. Set your **Connection Timeout** (recommended: \`1000ms\`).
6. Tap **Save Config**. The UDP socket will instantly bind to the new target without restarting the app.

### In the ESP32 Firmware:
Open \`MyDrone_ESP32_Receiver.ino\` and edit lines 20-24:
\`\`\`cpp
// Wi-Fi Access Point Configuration
const char* AP_SSID = "MyDrone-AP";
const char* AP_PASS = "flydrone123";
const int UDP_PORT = 8888; // Match with Android Settings

IPAddress local_IP(192, 168, 4, 1); // Change here if desired
\`\`\`
Re-upload to your ESP32 board using Arduino IDE or PlatformIO.
`
  }
};
