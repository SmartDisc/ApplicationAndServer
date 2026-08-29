import { ref, computed } from 'vue'
import { BleClient } from '@capacitor-community/bluetooth-le'
import { Capacitor } from '@capacitor/core'
import {
  DEVICE_SERVICE_UUID,
  DEVICE_STATUS_UUID,
  PROTOCOL_INFO_UUID,
  DATA_SERVICE_UUID,
  DATA_FRAME_UUID,
  BATTERY_SERVICE_UUID,
  BATTERY_LEVEL_UUID,
  SUPPORTED_PROTOCOL_MAJOR,
  parseDataFrame,
  parseDeviceStatus,
  parseProtocolInfo,
  pressureToRelativeAltitudeM,
} from '@/services/ble'

// Whether BleClient.initialize() has succeeded at least once. Deliberately a
// module-level flag (not per-instance) since re-initializing the plugin on
// every connect() call is wasteful and initialize() is idempotent to call
// once per app lifetime.
let bleInitialized = false

// Hard cap on recordingSeries length, kept in sync with the backend's own
// 3000-entry cap on the `series` field.
const RECORDING_SERIES_MAX_LENGTH = 3000

function classifyRequestDeviceError(err) {
  const msg = String(err?.message ?? err ?? '').toLowerCase()
  if (msg.includes('permission')) return 'permission_denied'
  return 'device_not_found'
}

function classifyConnectError(err) {
  const msg = String(err?.message ?? err ?? '').toLowerCase()
  if (msg.includes('permission')) return 'permission_denied'
  return 'connection_failed'
}

/**
 * Vue composable wrapping @capacitor-community/bluetooth-le for the
 * SmartDisc BLE protocol (see Disc/BLE_PROTOCOL.md). Each call to
 * useDiscBle() creates its own local state — there's only ever one physical
 * BLE connection in use at a time, and the live view that calls this owns
 * the connection's lifecycle, so (unlike useDiscs.js's module-level
 * singleton) no shared/module-level state is used here.
 *
 * connect() never throws: on any failure it sets connectionState back to
 * 'disconnected' and records connectionErrorCode, so callers can simply
 * await it and read the refs afterwards.
 */
export function useDiscBle() {
  const connectionState = ref('disconnected')
  const connectionErrorCode = ref(null)
  const isConnected = computed(() => connectionState.value === 'connected')
  const deviceName = ref(null)
  const firmwareVersion = ref(null)
  const protocolCompatible = ref(null)
  const batteryPercent = ref(null)
  const deviceState = ref(null)
  const lowBattery = ref(false)
  const isStreaming = ref(false)
  const latest = ref(null)
  const isRecording = ref(false)

  // Internal (non-reactive) connection state.
  let deviceId = null
  let batterySubscribed = false
  let baselinePressurePa = null

  // Internal recording buffer.
  let recordingStartedAt = null
  let recordingSamples = 0
  let recordingMaxRpm = 0
  let recordingMaxAltM = 0
  let recordingMaxAccelMagnitude = 0
  let recordingSeries = []

  function resetDeviceRefs() {
    deviceName.value = null
    firmwareVersion.value = null
    protocolCompatible.value = null
    batteryPercent.value = null
    deviceState.value = null
    lowBattery.value = false
    isStreaming.value = false
    latest.value = null
    baselinePressurePa = null
  }

  function resetRecordingBuffer() {
    recordingStartedAt = null
    recordingSamples = 0
    recordingMaxRpm = 0
    recordingMaxAltM = 0
    recordingMaxAccelMagnitude = 0
    recordingSeries = []
  }

  function accelMagnitudeG_mg(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z) / 1000
  }

  function onDataFrame(dataView) {
    const frame = parseDataFrame(dataView)
    if (baselinePressurePa == null) baselinePressurePa = frame.pressurePa

    const last = frame.samples[frame.samples.length - 1]
    const altitudeM = pressureToRelativeAltitudeM(frame.pressurePa, baselinePressurePa)

    latest.value = {
      timestampMs: frame.timestampMs,
      rpm: last.rpm,
      accelMagnitudeG: accelMagnitudeG_mg(last.accelX_mg, last.accelY_mg, last.accelZ_mg),
      altitudeM,
      pressurePa: frame.pressurePa,
      inFlight: frame.inFlight,
      accelClipped: frame.accelClipped,
      gyroClipped: frame.gyroClipped,
    }

    if (isRecording.value) {
      recordingSamples += frame.samples.length
      let frameMaxRpm = 0
      for (const s of frame.samples) {
        if (s.rpm > recordingMaxRpm) recordingMaxRpm = s.rpm
        if (s.rpm > frameMaxRpm) frameMaxRpm = s.rpm
        const mag = accelMagnitudeG_mg(s.accelX_mg, s.accelY_mg, s.accelZ_mg)
        if (mag > recordingMaxAccelMagnitude) recordingMaxAccelMagnitude = mag
      }
      if (altitudeM > recordingMaxAltM) recordingMaxAltM = altitudeM
      if (recordingSeries.length < RECORDING_SERIES_MAX_LENGTH) {
        recordingSeries.push({ tMs: Date.now() - recordingStartedAt, rpm: frameMaxRpm, altM: altitudeM })
      }
    }
  }

  function onDeviceStatus(dataView) {
    const status = parseDeviceStatus(dataView)
    deviceState.value = status.state
    lowBattery.value = status.lowBattery
  }

  function onBatteryLevel(dataView) {
    batteryPercent.value = dataView.getUint8(0)
  }

  /** Registered as BleClient.connect()'s onDisconnect callback. */
  function handleUnexpectedDisconnect() {
    if (isRecording.value) {
      // Discard the in-progress recording — the UI decides what to tell the
      // user based on isRecording flipping to false on its own.
      isRecording.value = false
      resetRecordingBuffer()
    }
    deviceId = null
    isStreaming.value = false
    connectionState.value = 'disconnected'
    connectionErrorCode.value = 'disconnected_unexpectedly'
  }

  async function connect() {
    connectionState.value = 'scanning'
    connectionErrorCode.value = null
    resetDeviceRefs()

    try {
      if (!bleInitialized) {
        await BleClient.initialize({ androidNeverForLocation: true })
        bleInitialized = true
      }
    } catch {
      connectionState.value = 'disconnected'
      connectionErrorCode.value = 'unsupported'
      return
    }

    let device
    try {
      // No `services` filter: on web this makes the plugin pass
      // acceptAllDevices to navigator.bluetooth.requestDevice(), so the
      // chooser lists every nearby Bluetooth device rather than only ones
      // advertising DEVICE_SERVICE_UUID. All services we later read from
      // still have to be declared here (as optionalServices) or the Web
      // Bluetooth API refuses access to them post-connect.
      device = await BleClient.requestDevice({
        optionalServices: [DEVICE_SERVICE_UUID, DATA_SERVICE_UUID, BATTERY_SERVICE_UUID],
      })
    } catch (err) {
      console.error('[useDiscBle] requestDevice failed:', err)
      connectionState.value = 'disconnected'
      connectionErrorCode.value = classifyRequestDeviceError(err)
      return
    }

    deviceId = device.deviceId
    deviceName.value = device.name || null
    connectionState.value = 'connecting'

    try {
      await BleClient.connect(deviceId, handleUnexpectedDisconnect)
    } catch (err) {
      console.error('[useDiscBle] BleClient.connect failed:', err)
      connectionState.value = 'disconnected'
      connectionErrorCode.value = classifyConnectError(err)
      deviceId = null
      return
    }

    // Read Protocol Information first (no pairing required) and bail before
    // ever subscribing to encrypted characteristics if incompatible.
    try {
      const infoView = await BleClient.read(deviceId, DEVICE_SERVICE_UUID, PROTOCOL_INFO_UUID)
      const info = parseProtocolInfo(infoView)
      firmwareVersion.value = info.firmwareVersion
      protocolCompatible.value = info.protocolMajor === SUPPORTED_PROTOCOL_MAJOR
      if (!protocolCompatible.value) {
        connectionErrorCode.value = 'protocol_incompatible'
        try { await BleClient.disconnect(deviceId) } catch { /* best-effort */ }
        deviceId = null
        connectionState.value = 'disconnected'
        return
      }
    } catch (err) {
      console.error('[useDiscBle] protocol info read failed:', err)
      connectionErrorCode.value = 'connection_failed'
      try { await BleClient.disconnect(deviceId) } catch { /* best-effort */ }
      deviceId = null
      connectionState.value = 'disconnected'
      return
    }

    // Request a larger ATT MTU (Android only). Note: the installed plugin
    // version (@capacitor-community/bluetooth-le) has no explicit "request
    // MTU" JS API — on Android its native layer already requests MTU 512
    // automatically as part of connect(). getMtu() here is just a best-effort
    // confirmation and is safe to ignore if it fails or is unsupported
    // (e.g. iOS/web, which negotiate automatically with no app action).
    if (Capacitor.getPlatform() === 'android') {
      try {
        await BleClient.getMtu(deviceId)
      } catch { /* best-effort */ }
    }

    try {
      await BleClient.startNotifications(deviceId, DEVICE_SERVICE_UUID, DEVICE_STATUS_UUID, onDeviceStatus)
    } catch { /* best-effort */ }

    try {
      await BleClient.startNotifications(deviceId, BATTERY_SERVICE_UUID, BATTERY_LEVEL_UUID, onBatteryLevel)
      batterySubscribed = true
    } catch {
      batterySubscribed = false
    }

    try {
      await BleClient.startNotifications(deviceId, DATA_SERVICE_UUID, DATA_FRAME_UUID, onDataFrame)
      isStreaming.value = true
    } catch (err) {
      console.error('[useDiscBle] data notifications subscribe failed:', err)
      connectionErrorCode.value = 'connection_failed'
      try { await BleClient.disconnect(deviceId) } catch { /* best-effort */ }
      deviceId = null
      connectionState.value = 'disconnected'
      return
    }

    connectionState.value = 'connected'
  }

  async function disconnect() {
    if (!deviceId) {
      connectionState.value = 'disconnected'
      return
    }
    if (isRecording.value) {
      isRecording.value = false
      resetRecordingBuffer()
    }

    connectionState.value = 'disconnecting'
    const id = deviceId

    try { await BleClient.stopNotifications(id, DATA_SERVICE_UUID, DATA_FRAME_UUID) } catch { /* best-effort */ }
    try { await BleClient.stopNotifications(id, DEVICE_SERVICE_UUID, DEVICE_STATUS_UUID) } catch { /* best-effort */ }
    if (batterySubscribed) {
      try { await BleClient.stopNotifications(id, BATTERY_SERVICE_UUID, BATTERY_LEVEL_UUID) } catch { /* best-effort */ }
      batterySubscribed = false
    }
    try { await BleClient.disconnect(id) } catch { /* best-effort */ }

    deviceId = null
    isStreaming.value = false
    connectionState.value = 'disconnected'
  }

  function startRecording() {
    if (!isConnected.value) return
    resetRecordingBuffer()
    baselinePressurePa = latest.value?.pressurePa ?? baselinePressurePa
    recordingStartedAt = Date.now()
    isRecording.value = true
  }

  function stopRecording() {
    if (!isRecording.value) return null
    const start = recordingStartedAt
    const result = {
      recordedAt: new Date(start).toISOString(),
      durationMs: Date.now() - start,
      maxRpm: recordingMaxRpm,
      maxAltM: recordingMaxAltM,
      maxAccelMagnitude: recordingMaxAccelMagnitude,
      sampleCount: recordingSamples,
      series: [...recordingSeries],
    }
    isRecording.value = false
    resetRecordingBuffer()
    return result
  }

  return {
    connectionState,
    connectionErrorCode,
    isConnected,
    deviceName,
    firmwareVersion,
    protocolCompatible,
    batteryPercent,
    deviceState,
    lowBattery,
    isStreaming,
    latest,
    isRecording,

    connect,
    disconnect,
    startRecording,
    stopRecording,
  }
}
