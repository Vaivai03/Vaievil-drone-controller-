export interface AndroidSourceFile {
  path: string;
  name: string;
  language: 'kotlin' | 'xml' | 'groovy' | 'properties';
  description: string;
  content: string;
}

export const ANDROID_PROJECT_FILES: AndroidSourceFile[] = [
  {
    path: 'settings.gradle.kts',
    name: 'settings.gradle.kts',
    language: 'kotlin',
    description: 'Gradle repository configuration and project name definition',
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "MyDroneController"
include(":app")`
  },
  {
    path: 'build.gradle.kts',
    name: 'build.gradle.kts (Project)',
    language: 'kotlin',
    description: 'Root Gradle build file with Android and Kotlin Compose plugins',
    content: `plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}`
  },
  {
    path: 'app/build.gradle.kts',
    name: 'app/build.gradle.kts (App Module)',
    language: 'kotlin',
    description: 'App dependencies including Jetpack Compose, Coroutines, and AndroidX',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.mydrone.controller"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mydrone.controller"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.activity:activity-compose:1.9.3")
    
    // Jetpack Compose BOM
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Kotlin Coroutines for UDP background networking
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    
    // Preview tooling
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}`
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    language: 'xml',
    description: 'Android permissions for Wi-Fi direct socket communication & Landscape orientation',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Wi-Fi & Local Network Permissions (no internet needed) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
    <!-- Keep screen awake during flight operations -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="MyDrone Controller"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.MyDroneController"
        android:usesCleartextTraffic="true">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="landscape"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden"
            android:theme="@style/Theme.MyDroneController">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`
  },
  {
    path: 'app/src/main/java/com/mydrone/controller/MainActivity.kt',
    name: 'MainActivity.kt',
    language: 'kotlin',
    description: 'Main activity setup with screen-keep-awake flag and Compose entry',
    content: `package com.mydrone.controller

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mydrone.controller.ui.DroneViewModel
import com.mydrone.controller.ui.screens.MainDroneApp
import com.mydrone.controller.ui.theme.MyDroneTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Critical for safety: Keep screen on while controlling quadcopter
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enableEdgeToEdge()

        setContent {
            MyDroneTheme {
                val viewModel: DroneViewModel = viewModel()
                MainDroneApp(viewModel = viewModel)
            }
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/mydrone/controller/data/DroneProtocol.kt',
    name: 'DroneProtocol.kt',
    language: 'kotlin',
    description: 'Command protocol definitions, packet formatting, and bounds checking',
    content: `package com.mydrone.controller.data

/**
 * Protocol Specification:
 * - Movement: THROTTLE=T;YAW=Y;PITCH=P;ROLL=R
 *   where T in [0..100], Y, P, R in [-100..+100]
 * - Arming: ARM
 * - Disarming: DISARM
 * - Emergency Stop: ESTOP
 * - Camera: PHOTO | RECORD_START | RECORD_STOP
 * - Heartbeat: PING
 */
object DroneProtocol {
    const val CMD_ARM = "ARM"
    const val CMD_DISARM = "DISARM"
    const val CMD_ESTOP = "ESTOP"
    const val CMD_PHOTO = "PHOTO"
    const val CMD_RECORD_START = "RECORD_START"
    const val CMD_RECORD_STOP = "RECORD_STOP"
    const val CMD_PING = "PING"

    // Safe bounds
    const val MIN_THROTTLE = 0
    const val MAX_THROTTLE = 100
    const val MIN_AXIS = -100
    const val MAX_AXIS = 100

    /**
     * Formats normalized joystick values into the standard command string
     */
    fun formatMovementCommand(throttle: Int, yaw: Int, pitch: Int, roll: Int): String {
        val safeThrottle = throttle.coerceIn(MIN_THROTTLE, MAX_THROTTLE)
        val safeYaw = yaw.coerceIn(MIN_AXIS, MAX_AXIS)
        val safePitch = pitch.coerceIn(MIN_AXIS, MAX_AXIS)
        val safeRoll = roll.coerceIn(MIN_AXIS, MAX_AXIS)
        return "THROTTLE=$safeThrottle;YAW=$safeYaw;PITCH=$safePitch;ROLL=$safeRoll"
    }

    /**
     * Parses incoming ESP32 telemetry string (e.g. "BAT=85;VOLT=11.8;RSSI=-62;MODE=ARMED")
     */
    fun parseTelemetry(payload: String): Map<String, String> {
        val map = mutableMapOf<String, String>()
        payload.trim().split(";").forEach { pair ->
            val parts = pair.split("=")
            if (parts.size == 2) {
                map[parts[0].trim()] = parts[1].trim()
            }
        }
        return map
    }
}`
  },
  {
    path: 'app/src/main/java/com/mydrone/controller/network/DroneUdpClient.kt',
    name: 'DroneUdpClient.kt',
    language: 'kotlin',
    description: 'High-performance UDP socket client for low-latency ESP32 communication',
    content: `package com.mydrone.controller.network

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.SocketTimeoutException

class DroneUdpClient(
    private var targetIp: String = "192.168.4.1",
    private var targetPort: Int = 8888,
    private val scope: CoroutineScope
) {
    private var socket: DatagramSocket? = null
    private var inetAddress: InetAddress? = null
    private var listenerJob: Job? = null

    var onTelemetryReceived: ((String) -> Unit)? = null
    var onError: ((String) -> Unit)? = null

    init {
        updateTarget(targetIp, targetPort)
    }

    fun updateTarget(ip: String, port: Int) {
        targetIp = ip
        targetPort = port
        scope.launch(Dispatchers.IO) {
            try {
                inetAddress = InetAddress.getByName(targetIp)
                if (socket == null || socket?.isClosed == true) {
                    socket = DatagramSocket()
                    socket?.soTimeout = 1000 // 1 sec read timeout
                    startListening()
                }
            } catch (e: Exception) {
                Log.e("DroneUdpClient", "Error initializing socket: \${e.message}")
                onError?.invoke("Socket error: \${e.message}")
            }
        }
    }

    fun sendCommand(command: String) {
        scope.launch(Dispatchers.IO) {
            try {
                val data = (command + "\\n").toByteArray(Charsets.UTF_8)
                val address = inetAddress ?: InetAddress.getByName(targetIp)
                val packet = DatagramPacket(data, data.size, address, targetPort)
                socket?.send(packet)
            } catch (e: Exception) {
                Log.e("DroneUdpClient", "Failed to send: $command -> \${e.message}")
                onError?.invoke("Send failed: \${e.message}")
            }
        }
    }

    private fun startListening() {
        listenerJob?.cancel()
        listenerJob = scope.launch(Dispatchers.IO) {
            val buffer = ByteArray(512)
            while (isActive) {
                try {
                    val packet = DatagramPacket(buffer, buffer.size)
                    socket?.receive(packet)
                    val received = String(packet.data, 0, packet.length, Charsets.UTF_8).trim()
                    if (received.isNotEmpty()) {
                        onTelemetryReceived?.invoke(received)
                    }
                } catch (e: SocketTimeoutException) {
                    // Normal timeout for non-blocking loop
                } catch (e: Exception) {
                    if (isActive) {
                        Log.e("DroneUdpClient", "Receive error: \${e.message}")
                    }
                }
            }
        }
    }

    fun close() {
        listenerJob?.cancel()
        socket?.close()
        socket = null
    }
}`
  },
  {
    path: 'app/src/main/java/com/mydrone/controller/ui/DroneViewModel.kt',
    name: 'DroneViewModel.kt',
    language: 'kotlin',
    description: 'State management, periodic command loop, failsafe timer, and arming locks',
    content: `package com.mydrone.controller.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mydrone.controller.data.DroneProtocol
import com.mydrone.controller.network.DroneUdpClient
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class DroneUiState(
    val isConnected: Boolean = false,
    val isArmed: Boolean = false,
    val isRecording: Boolean = false,
    val photoCount: Int = 0,
    val esp32Ip: String = "192.168.4.1",
    val esp32Port: Int = 8888,
    val sendFrequencyHz: Int = 20, // 20 Hz = 50ms interval
    val timeoutMs: Long = 1000L,
    val testMode: Boolean = false,
    val batteryPercent: Int = 88,
    val rssiDbm: Int = -58,
    val throttle: Int = 0,
    val yaw: Int = 0,
    val pitch: Int = 0,
    val roll: Int = 0,
    val lastSentCommand: String = "",
    val lastReceivedTelemetry: String = "READY",
    val commandLog: List<String> = emptyList(),
    val isArmConfirmDialogOpen: Boolean = false
)

class DroneViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(DroneUiState())
    val uiState: StateFlow<DroneUiState> = _uiState.asStateFlow()

    private val udpClient = DroneUdpClient(
        targetIp = _uiState.value.esp32Ip,
        targetPort = _uiState.value.esp32Port,
        scope = viewModelScope
    )

    private var commandLoopJob: Job? = null
    private var heartbeatCheckJob: Job? = null
    private var lastTelemetryTimestamp = System.currentTimeMillis()

    init {
        setupUdpCallbacks()
        startCommandLoop()
        startHeartbeatMonitor()
    }

    private fun setupUdpCallbacks() {
        udpClient.onTelemetryReceived = { rawTelemetry ->
            lastTelemetryTimestamp = System.currentTimeMillis()
            val parsed = DroneProtocol.parseTelemetry(rawTelemetry)
            val bat = parsed["BAT"]?.toIntOrNull() ?: _uiState.value.batteryPercent
            val rssi = parsed["RSSI"]?.toIntOrNull() ?: _uiState.value.rssiDbm
            _uiState.update {
                it.copy(
                    isConnected = true,
                    batteryPercent = bat,
                    rssiDbm = rssi,
                    lastReceivedTelemetry = rawTelemetry
                )
            }
        }

        udpClient.onError = { error ->
            logCommand("NETWORK_ERR: $error")
        }
    }

    fun startCommandLoop() {
        commandLoopJob?.cancel()
        commandLoopJob = viewModelScope.launch {
            while (isActive) {
                val state = _uiState.value
                val intervalMs = (1000L / state.sendFrequencyHz.coerceIn(5, 50))
                
                // Only send active joystick commands when connected or in test mode
                if (state.isConnected || state.testMode) {
                    val cmd = DroneProtocol.formatMovementCommand(
                        throttle = state.throttle,
                        yaw = state.yaw,
                        pitch = state.pitch,
                        roll = state.roll
                    )
                    
                    if (!state.testMode) {
                        udpClient.sendCommand(cmd)
                    }
                    _uiState.update { it.copy(lastSentCommand = cmd) }
                }
                delay(intervalMs)
            }
        }
    }

    private fun startHeartbeatMonitor() {
        heartbeatCheckJob?.cancel()
        heartbeatCheckJob = viewModelScope.launch {
            while (isActive) {
                val state = _uiState.value
                val elapsed = System.currentTimeMillis() - lastTelemetryTimestamp
                
                if (elapsed > state.timeoutMs && state.isConnected && !state.testMode) {
                    // FAILSAFE TRIGGERED: Loss of connection!
                    _uiState.update { 
                        it.copy(
                            isConnected = false,
                            isArmed = false,
                            throttle = 0 // Instant throttle cut for safety
                        ) 
                    }
                    logCommand("FAILSAFE: Signal lost after \${elapsed}ms -> THROTTLE CUT")
                }
                delay(200)
            }
        }
    }

    fun updateLeftJoystick(throttleVal: Int, yawVal: Int) {
        _uiState.update { it.copy(throttle = throttleVal.coerceIn(0, 100), yaw = yawVal.coerceIn(-100, 100)) }
    }

    fun updateRightJoystick(pitchVal: Int, rollVal: Int) {
        _uiState.update { it.copy(pitch = pitchVal.coerceIn(-100, 100), roll = rollVal.coerceIn(-100, 100)) }
    }

    fun requestArm() {
        if (_uiState.value.throttle > 5) {
            logCommand("SAFETY REJECT: Cannot ARM while throttle > 0%")
            return
        }
        _uiState.update { it.copy(isArmConfirmDialogOpen = true) }
    }

    fun confirmArm() {
        _uiState.update { it.copy(isArmed = true, isArmConfirmDialogOpen = false) }
        sendCommand(DroneProtocol.CMD_ARM)
        logCommand("DRONE ARMED - MOTORS LIVE")
    }

    fun dismissArmDialog() {
        _uiState.update { it.copy(isArmConfirmDialogOpen = false) }
    }

    fun disarm() {
        _uiState.update { it.copy(isArmed = false, throttle = 0) }
        sendCommand(DroneProtocol.CMD_DISARM)
        logCommand("DRONE DISARMED - MOTORS OFF")
    }

    fun emergencyStop() {
        _uiState.update { it.copy(isArmed = false, throttle = 0, yaw = 0, pitch = 0, roll = 0) }
        sendCommand(DroneProtocol.CMD_ESTOP)
        logCommand("EMERGENCY STOP (ESTOP) FIRED")
    }

    fun takePhoto() {
        sendCommand(DroneProtocol.CMD_PHOTO)
        _uiState.update { it.copy(photoCount = it.photoCount + 1) }
        logCommand("PHOTO TRIGGERED (Snap #\${_uiState.value.photoCount})")
    }

    fun toggleRecording() {
        val willRecord = !_uiState.value.isRecording
        val cmd = if (willRecord) DroneProtocol.CMD_RECORD_START else DroneProtocol.CMD_RECORD_STOP
        sendCommand(cmd)
        _uiState.update { it.copy(isRecording = willRecord) }
        logCommand(if (willRecord) "REC STARTED" else "REC STOPPED")
    }

    fun updateSettings(ip: String, port: Int, freq: Int, timeout: Long, testMode: Boolean) {
        _uiState.update {
            it.copy(
                esp32Ip = ip,
                esp32Port = port,
                sendFrequencyHz = freq,
                timeoutMs = timeout,
                testMode = testMode
            )
        }
        udpClient.updateTarget(ip, port)
        startCommandLoop()
        logCommand("CONFIG UPDATED: $ip:$port @ \${freq}Hz (TestMode: $testMode)")
    }

    private fun sendCommand(cmd: String) {
        if (!_uiState.value.testMode) {
            udpClient.sendCommand(cmd)
        }
        _uiState.update { it.copy(lastSentCommand = cmd) }
    }

    private fun logCommand(entry: String) {
        _uiState.update {
            val list = (listOf(entry) + it.commandLog).take(50)
            it.copy(commandLog = list)
        }
    }

    override fun onCleared() {
        super.onCleared()
        udpClient.close()
    }
}`
  },
  {
    path: 'app/src/main/java/com/mydrone/controller/ui/components/VirtualJoystick.kt',
    name: 'VirtualJoystick.kt',
    language: 'kotlin',
    description: 'Compose Canvas touch joystick supporting circular bounds, deadzone & auto-centering',
    content: `package com.mydrone.controller.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Virtual 2-axis joystick with high precision touch tracking.
 * @param isThrottleYaw If true, vertical axis is throttle (0..100) and horizontal is yaw (-100..100)
 *                      If false, vertical axis is pitch (-100..100) and horizontal is roll (-100..100)
 */
@Composable
fun VirtualJoystick(
    modifier: Modifier = Modifier,
    sizeDp: Int = 180,
    isThrottleYaw: Boolean = false,
    springCenterVertical: Boolean = false,
    onValueChange: (vertical: Int, horizontal: Int) -> Unit
) {
    var thumbOffset by remember { mutableStateOf(Offset.Zero) }
    val maxRadiusPx = (sizeDp * 2.5f) / 2f

    Box(
        modifier = modifier
            .size(sizeDp.dp)
            .background(Color(0xFF0F172A).copy(alpha = 0.8f), CircleShape)
            .pointerInput(isThrottleYaw, springCenterVertical) {
                detectDragGestures(
                    onDragStart = { offset ->
                        val center = Offset(size.width / 2f, size.height / 2f)
                        val delta = offset - center
                        thumbOffset = clampThumb(delta, maxRadiusPx)
                        dispatchValues(thumbOffset, maxRadiusPx, isThrottleYaw, onValueChange)
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        thumbOffset = clampThumb(thumbOffset + dragAmount, maxRadiusPx)
                        dispatchValues(thumbOffset, maxRadiusPx, isThrottleYaw, onValueChange)
                    },
                    onDragEnd = {
                        thumbOffset = if (isThrottleYaw && !springCenterVertical) {
                            // Keep throttle vertical position, center yaw
                            Offset(0f, thumbOffset.y)
                        } else {
                            Offset.Zero
                        }
                        dispatchValues(thumbOffset, maxRadiusPx, isThrottleYaw, onValueChange)
                    },
                    onDragCancel = {
                        thumbOffset = Offset.Zero
                        dispatchValues(thumbOffset, maxRadiusPx, isThrottleYaw, onValueChange)
                    }
                )
            },
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(sizeDp.dp)) {
            val center = Offset(size.width / 2f, size.height / 2f)
            val outerRadius = size.width / 2f - 4f

            // Outer Ring
            drawCircle(
                color = Color(0xFF38BDF8).copy(alpha = 0.3f),
                radius = outerRadius,
                center = center,
                style = Stroke(width = 3f)
            )

            // Crosshairs
            drawLine(
                color = Color(0xFF38BDF8).copy(alpha = 0.2f),
                start = Offset(center.x, 8f),
                end = Offset(center.x, size.height - 8f),
                strokeWidth = 2f
            )
            drawLine(
                color = Color(0xFF38BDF8).copy(alpha = 0.2f),
                start = Offset(8f, center.y),
                end = Offset(size.width - 8f, center.y),
                strokeWidth = 2f
            )

            // Inner Thumb Knurled Stick
            val thumbPos = center + thumbOffset
            drawCircle(
                color = Color(0xFF0284C7).copy(alpha = 0.4f),
                radius = 36f,
                center = thumbPos
            )
            drawCircle(
                color = Color(0xFF38BDF8),
                radius = 24f,
                center = thumbPos
            )
            drawCircle(
                color = Color.White,
                radius = 6f,
                center = thumbPos
            )
        }
    }
}

private fun clampThumb(delta: Offset, maxRadius: Float): Offset {
    val distance = sqrt(delta.x * delta.x + delta.y * delta.y)
    return if (distance > maxRadius) {
        val angle = atan2(delta.y, delta.x)
        Offset(cos(angle) * maxRadius, sin(angle) * maxRadius)
    } else {
        delta
    }
}

private fun dispatchValues(
    offset: Offset,
    maxRadius: Float,
    isThrottleYaw: Boolean,
    onValueChange: (Int, Int) -> Unit
) {
    val normX = (offset.x / maxRadius).coerceIn(-1f, 1f)
    val normY = (-offset.y / maxRadius).coerceIn(-1f, 1f) // Invert Y so up is positive

    if (isThrottleYaw) {
        // Vertical is 0 to 100
        val throttle = (((normY + 1f) / 2f) * 100f).toInt().coerceIn(0, 100)
        val yaw = (normX * 100f).toInt().coerceIn(-100, 100)
        onValueChange(throttle, yaw)
    } else {
        // Pitch is -100 to +100, Roll is -100 to +100
        val pitch = (normY * 100f).toInt().coerceIn(-100, 100)
        val roll = (normX * 100f).toInt().coerceIn(-100, 100)
        onValueChange(pitch, roll)
    }
}`
  },
  {
    path: 'app/src/main/java/com/mydrone/controller/ui/screens/DroneControlScreen.kt',
    name: 'DroneControlScreen.kt',
    language: 'kotlin',
    description: 'Main tactical flight cockpit screen with joysticks, HUD, and safety triggers',
    content: `package com.mydrone.controller.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Camera
import androidx.compose.material.icons.filled.FiberManualRecord
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mydrone.controller.ui.DroneUiState
import com.mydrone.controller.ui.DroneViewModel
import com.mydrone.controller.ui.components.VirtualJoystick

@Composable
fun MainDroneApp(viewModel: DroneViewModel) {
    val state by viewModel.uiState.collectAsState()
    var isSettingsOpen by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF020617))
            .padding(12.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // TOP STATUS BAR
            TopTelemetryBar(
                state = state,
                onSettingsClick = { isSettingsOpen = true }
            )

            Spacer(modifier = Modifier.height(8.dp))

            // MAIN FLIGHT COCKPIT
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // LEFT JOYSTICK (Throttle & Yaw)
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "THROTTLE: \${state.throttle}%  YAW: \${state.yaw}",
                        color = Color(0xFF38BDF8),
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    VirtualJoystick(
                        sizeDp = 170,
                        isThrottleYaw = true,
                        onValueChange = { throttle, yaw ->
                            viewModel.updateLeftJoystick(throttle, yaw)
                        }
                    )
                }

                // CENTER HUD & SAFETY ACTION BUTTONS
                CenterControlPanel(
                    state = state,
                    onArmClick = { viewModel.requestArm() },
                    onDisarmClick = { viewModel.disarm() },
                    onEstopClick = { viewModel.emergencyStop() },
                    onPhotoClick = { viewModel.takePhoto() },
                    onRecordClick = { viewModel.toggleRecording() }
                )

                // RIGHT JOYSTICK (Pitch & Roll)
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "PITCH: \${state.pitch}  ROLL: \${state.roll}",
                        color = Color(0xFF38BDF8),
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    VirtualJoystick(
                        sizeDp = 170,
                        isThrottleYaw = false,
                        onValueChange = { pitch, roll ->
                            viewModel.updateRightJoystick(pitch, roll)
                        }
                    )
                }
            }

            // BOTTOM COMMAND MONITOR / TEST MODE FOOTER
            BottomCommandFooter(state = state)
        }

        // CONFIRMATION DIALOG FOR ARMING
        if (state.isArmConfirmDialogOpen) {
            AlertDialog(
                onDismissRequest = { viewModel.dismissArmDialog() },
                title = { Text("CONFIRM MOTORS ARMING", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold) },
                text = {
                    Text(
                        "Quadcopter motors will spin up immediately.\\n" +
                        "Confirm propellers are clear and flight area is safe.",
                        color = Color.White
                    )
                },
                confirmButton = {
                    Button(
                        onClick = { viewModel.confirmArm() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                    ) {
                        Text("ARM MOTORS", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    OutlinedButton(onClick = { viewModel.dismissArmDialog() }) {
                        Text("CANCEL")
                    }
                }
            )
        }

        // SETTINGS SCREEN DIALOG
        if (isSettingsOpen) {
            SettingsDialog(
                state = state,
                onDismiss = { isSettingsOpen = false },
                onSave = { ip, port, freq, timeout, testMode ->
                    viewModel.updateSettings(ip, port, freq, timeout, testMode)
                    isSettingsOpen = false
                }
            )
        }
    }
}

@Composable
fun TopTelemetryBar(state: DroneUiState, onSettingsClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF0F172A), RoundedCornerShape(8.dp))
            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(8.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Connection & IP
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            val statusColor = if (state.isConnected || state.testMode) Color(0xFF10B981) else Color(0xFFEF4444)
            Box(modifier = Modifier.size(10.dp).background(statusColor, RoundedCornerShape(5.dp)))
            Text(
                text = if (state.testMode) "TEST MODE (VIRTUAL ESP32)" else if (state.isConnected) "CONNECTED" else "DISCONNECTED",
                color = statusColor,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            )
            Text(text = "·", color = Color.Gray)
            Text(
                text = "ESP32: \${state.esp32Ip}:\${state.esp32Port}",
                color = Color(0xFF94A3B8),
                fontFamily = FontFamily.Monospace,
                fontSize = 12.sp
            )
        }

        // Battery & Arm Status
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                text = "BAT: \${state.batteryPercent}%",
                color = if (state.batteryPercent > 25) Color(0xFF10B981) else Color(0xFFEF4444),
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace
            )
            Text(
                text = "RSSI: \${state.rssiDbm} dBm",
                color = Color(0xFF38BDF8),
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace
            )
            val armBadgeColor = if (state.isArmed) Color(0xFFDC2626) else Color(0xFF64748B)
            Text(
                text = if (state.isArmed) "● ARMED" else "○ DISARMED",
                color = armBadgeColor,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            )
            IconButton(onClick = onSettingsClick, modifier = Modifier.size(28.dp)) {
                Icon(Icons.Default.Settings, contentDescription = "Settings", tint = Color.White)
            }
        }
    }
}

@Composable
fun CenterControlPanel(
    state: DroneUiState,
    onArmClick: () -> Unit,
    onDisarmClick: () -> Unit,
    onEstopClick: () -> Unit,
    onPhotoClick: () -> Unit,
    onRecordClick: () -> Unit
) {
    Column(
        modifier = Modifier.width(220.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // EMERGENCY STOP (Prominent red alert)
        Button(
            onClick = onEstopClick,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF991B1B)),
            shape = RoundedCornerShape(8.dp)
        ) {
            Icon(Icons.Default.Warning, contentDescription = "ESTOP", tint = Color.White)
            Spacer(modifier = Modifier.width(6.dp))
            Text("EMERGENCY STOP", fontWeight = FontWeight.Black, fontSize = 13.sp)
        }

        // ARM / DISARM BUTTONS
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = onArmClick,
                enabled = !state.isArmed,
                modifier = Modifier.weight(1f).height(44.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("ARM", fontWeight = FontWeight.Bold)
            }
            Button(
                onClick = onDisarmClick,
                enabled = state.isArmed,
                modifier = Modifier.weight(1f).height(44.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("DISARM", fontWeight = FontWeight.Bold)
            }
        }

        // CAMERA CONTROLS (Modular)
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick = onPhotoClick,
                modifier = Modifier.weight(1f).height(40.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF38BDF8))
            ) {
                Icon(Icons.Default.Camera, contentDescription = "Photo", modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("PHOTO (\${state.photoCount})", fontSize = 11.sp)
            }

            Button(
                onClick = onRecordClick,
                modifier = Modifier.weight(1f).height(40.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (state.isRecording) Color(0xFFEF4444) else Color(0xFF1E293B)
                )
            ) {
                Icon(
                    Icons.Default.FiberManualRecord,
                    contentDescription = "REC",
                    tint = if (state.isRecording) Color.White else Color.Red,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(if (state.isRecording) "STOP REC" else "RECORD", fontSize = 11.sp)
            }
        }
    }
}

@Composable
fun BottomCommandFooter(state: DroneUiState) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF090D16), RoundedCornerShape(6.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "TX: \${state.lastSentCommand.ifEmpty { "IDLE" }}",
            color = Color(0xFF0284C7),
            fontFamily = FontFamily.Monospace,
            fontSize = 11.sp
        )
        Text(
            text = "RX: \${state.lastReceivedTelemetry}",
            color = Color(0xFF10B981),
            fontFamily = FontFamily.Monospace,
            fontSize = 11.sp
        )
    }
}`
  },
  {
    path: 'app/src/main/java/com/mydrone/controller/ui/screens/SettingsScreen.kt',
    name: 'SettingsScreen.kt',
    language: 'kotlin',
    description: 'Settings dialog for configuring ESP32 IP, port, frequency, timeout, and test mode',
    content: `package com.mydrone.controller.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.mydrone.controller.ui.DroneUiState

@Composable
fun SettingsDialog(
    state: DroneUiState,
    onDismiss: () -> Unit,
    onSave: (ip: String, port: Int, freq: Int, timeout: Long, testMode: Boolean) -> Unit
) {
    var ip by remember { mutableStateOf(state.esp32Ip) }
    var portText by remember { mutableStateOf(state.esp32Port.toString()) }
    var freqText by remember { mutableStateOf(state.sendFrequencyHz.toString()) }
    var timeoutText by remember { mutableStateOf(state.timeoutMs.toString()) }
    var testMode by remember { mutableStateOf(state.testMode) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color(0xFF0F172A),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = "DRONE & ESP32 CONFIGURATION",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )

                OutlinedTextField(
                    value = ip,
                    onValueChange = { ip = it },
                    label = { Text("ESP32 IP Address") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.LightGray
                    )
                )

                OutlinedTextField(
                    value = portText,
                    onValueChange = { portText = it },
                    label = { Text("ESP32 UDP Port (e.g. 8888)") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.LightGray
                    )
                )

                OutlinedTextField(
                    value = freqText,
                    onValueChange = { freqText = it },
                    label = { Text("Send Frequency (Hz: 10 - 50)") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.LightGray
                    )
                )

                OutlinedTextField(
                    value = timeoutText,
                    onValueChange = { timeoutText = it },
                    label = { Text("Connection Timeout (ms)") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.LightGray
                    )
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Test Mode (No Hardware)", color = Color.White, fontWeight = FontWeight.SemiBold)
                        Text("Simulates commands & telemetry", color = Color.Gray, fontSize = 11.sp)
                    }
                    Switch(
                        checked = testMode,
                        onCheckedChange = { testMode = it }
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("CANCEL", color = Color.Gray)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = {
                            val port = portText.toIntOrNull() ?: 8888
                            val freq = freqText.toIntOrNull() ?: 20
                            val timeout = timeoutText.toLongOrNull() ?: 1000L
                            onSave(ip, port, freq, timeout, testMode)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7))
                    ) {
                        Text("SAVE CONFIG", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/mydrone/controller/ui/theme/Theme.kt',
    name: 'Theme.kt',
    language: 'kotlin',
    description: 'Jetpack Compose dark theme styling for futuristic flight station',
    content: `package com.mydrone.controller.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF38BDF8),
    secondary = Color(0xFF0284C7),
    tertiary = Color(0xFF10B981),
    background = Color(0xFF020617),
    surface = Color(0xFF0F172A),
    error = Color(0xFFEF4444)
)

@Composable
fun MyDroneTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}`
  }
];
