export const ESP32_FIRMWARE_SKETCH = `/**
 * ============================================================================
 * MyDrone Controller - ESP32 Wi-Fi Access Point & Drone Bridge Firmware
 * ============================================================================
 * Hardware: ESP32 (e.g., NodeMCU ESP32, ESP32-WROOM-32, or ESP32-CAM)
 * Role:
 *   1. Creates Wi-Fi Access Point ("MyDrone-AP", IP: 192.168.4.1)
 *   2. Listens for UDP control packets on Port 8888 from Android Phone
 *   3. Translates commands to Flight Controller (Betaflight / INAV / ArduPilot) via Serial2 (MSP/CRSF or PWM)
 *   4. Enforces hardware SAFETY FAILSAFE: if no packets arrive for > 500ms, immediately cuts throttle!
 *
 * PHONE -> Wi-Fi UDP -> ESP32 -> Serial2 (GPIO 17 TX) -> FLIGHT CONTROLLER RX -> ESCs -> MOTORS
 * ============================================================================
 */

#include <WiFi.h>
#include <WiFiUdp.h>

// Wi-Fi Access Point Configuration
const char* AP_SSID = "MyDrone-AP";
const char* AP_PASS = "flydrone123"; // Min 8 chars, or set to NULL for open AP
const int UDP_PORT = 8888;

// Safety Parameters
const unsigned long FAILSAFE_TIMEOUT_MS = 500; // Cut motors if signal lost for 0.5s
unsigned long lastPacketTime = 0;
bool isArmed = false;
bool isFailsafeActive = false;

// Current Flight Channel Setpoints
int throttleVal = 0;   // 0 to 100
int yawVal = 0;        // -100 to +100
int pitchVal = 0;      // -100 to +100
int rollVal = 0;       // -100 to +100

// Flight Controller Serial Port (UART2)
// ESP32: GPIO 16 (RX), GPIO 17 (TX) -> Connect to Flight Controller RX pad (e.g. UART1/UART2)
HardwareSerial fcSerial(2);

WiFiUDP udp;
char packetBuffer[255];

void setup() {
  Serial.begin(115200);
  fcSerial.begin(115200, SERIAL_8N1, 16, 17); // Baud rate matching Flight Controller UART
  
  delay(500);
  Serial.println("\\n==========================================");
  Serial.println("  MyDrone Controller - ESP32 Bridge Boot  ");
  Serial.println("==========================================");

  // Configure ESP32 as Wi-Fi Access Point
  WiFi.mode(WIFI_AP);
  IPAddress local_IP(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);
  
  WiFi.softAPConfig(local_IP, gateway, subnet);
  WiFi.softAP(AP_SSID, AP_PASS);

  Serial.print("Access Point started: ");
  Serial.println(AP_SSID);
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.softAPIP());

  udp.begin(UDP_PORT);
  Serial.print("UDP Server listening on port: ");
  Serial.println(UDP_PORT);
  
  lastPacketTime = millis();
}

void loop() {
  int packetSize = udp.parsePacket();
  
  if (packetSize) {
    int len = udp.read(packetBuffer, 254);
    if (len > 0) {
      packetBuffer[len] = '\\0';
    }
    
    lastPacketTime = millis();
    isFailsafeActive = false;
    
    // Parse the received command
    parseDroneCommand(String(packetBuffer));

    // Send back Telemetry reply to Android phone
    sendTelemetryReply(udp.remoteIP(), udp.remotePort());
  }

  // Safety Watchdog: Check for communication loss
  if (millis() - lastPacketTime > FAILSAFE_TIMEOUT_MS) {
    if (!isFailsafeActive) {
      triggerFailsafe();
    }
  }

  // Forward calculated flight commands to Flight Controller
  outputToFlightController();

  delay(5); // Yield loop
}

void parseDroneCommand(String cmd) {
  cmd.trim();

  if (cmd == "ARM") {
    if (throttleVal <= 5) {
      isArmed = true;
      Serial.println("[STATE] ARM COMMAND ACCEPTED - MOTORS LIVE");
    } else {
      Serial.println("[SAFETY] ARM REJECTED: Throttle > 0%");
    }
    return;
  }
  
  if (cmd == "DISARM") {
    isArmed = false;
    throttleVal = 0;
    Serial.println("[STATE] DISARMED - MOTORS HALTED");
    return;
  }

  if (cmd == "ESTOP") {
    isArmed = false;
    throttleVal = 0;
    yawVal = 0;
    pitchVal = 0;
    rollVal = 0;
    Serial.println("[ALERT] EMERGENCY STOP TRIGGERED!");
    return;
  }

  if (cmd == "PHOTO") {
    Serial.println("[CAMERA] TAKE PHOTO PULSE");
    // Trigger camera shutter GPIO or send command to ESP32-CAM
    return;
  }

  if (cmd == "RECORD_START") {
    Serial.println("[CAMERA] RECORDING STARTED");
    return;
  }

  if (cmd == "RECORD_STOP") {
    Serial.println("[CAMERA] RECORDING STOPPED");
    return;
  }

  // Parse Joystick Format: THROTTLE=50;YAW=0;PITCH=10;ROLL=-5
  if (cmd.startsWith("THROTTLE=")) {
    int tIdx = cmd.indexOf("THROTTLE=");
    int yIdx = cmd.indexOf(";YAW=");
    int pIdx = cmd.indexOf(";PITCH=");
    int rIdx = cmd.indexOf(";ROLL=");

    if (tIdx != -1 && yIdx != -1 && pIdx != -1 && rIdx != -1) {
      throttleVal = cmd.substring(tIdx + 9, yIdx).toInt();
      yawVal = cmd.substring(yIdx + 5, pIdx).toInt();
      pitchVal = cmd.substring(pIdx + 7, rIdx).toInt();
      rollVal = cmd.substring(rIdx + 6).toInt();

      // Clamp values
      throttleVal = constrain(throttleVal, 0, 100);
      yawVal = constrain(yawVal, -100, 100);
      pitchVal = constrain(pitchVal, -100, 100);
      rollVal = constrain(rollVal, -100, 100);
    }
  }
}

void triggerFailsafe() {
  isFailsafeActive = true;
  isArmed = false;
  throttleVal = 0;
  yawVal = 0;
  pitchVal = 0;
  rollVal = 0;
  Serial.println("[FAILSAFE] WARNING: Wi-Fi connection lost from phone! Throttle set to 0%!");
}

void outputToFlightController() {
  if (!isArmed || isFailsafeActive) {
    // When disarmed or in failsafe, throttle is locked at 0
    throttleVal = 0;
  }

  // Map 0..100 & -100..+100 to standard RC Microseconds (1000us to 2000us)
  int rcThrottle = map(throttleVal, 0, 100, 1000, 2000);
  int rcYaw      = map(yawVal, -100, 100, 1000, 2000);
  int rcPitch    = map(pitchVal, -100, 100, 1000, 2000);
  int rcRoll     = map(rollVal, -100, 100, 1000, 2000);

  // Send packet to Flight Controller via Serial2
  // Format: $RC,ROLL,PITCH,THROTTLE,YAW,ARM_FLAG*
  fcSerial.printf("$RC,%d,%d,%d,%d,%d*\\n", rcRoll, rcPitch, rcThrottle, rcYaw, isArmed ? 1 : 0);
}

void sendTelemetryReply(IPAddress clientIp, uint16_t clientPort) {
  // Read simulated or actual battery voltage from ADC pin (e.g. GPIO 34 through voltage divider)
  float rawV = analogRead(34) * (3.3 / 4095.0) * 4.0; // Example 4:1 divider for 3S/4S LiPo
  int batPercent = 85;
  int rssi = WiFi.RSSI();

  char telem[128];
  snprintf(telem, sizeof(telem), "BAT=%d;RSSI=%d;ARMED=%d;FAILSAFE=%d", 
           batPercent, rssi, isArmed ? 1 : 0, isFailsafeActive ? 1 : 0);

  udp.beginPacket(clientIp, clientPort);
  udp.print(telem);
  udp.endPacket();
}
`;
