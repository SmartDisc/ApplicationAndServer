// Pure, framework-free SmartDisc BLE protocol module (protocol 3.0).
//
// No Vue/Capacitor imports here on purpose — everything in this file operates
// on plain DataViews/numbers so it's trivially unit-testable and reusable
// outside of the composable that drives the actual BleClient plugin calls.
//
// See Disc/BLE_PROTOCOL.md for the authoritative byte layouts this mirrors.

// --- UUIDs -----------------------------------------------------------------

export const DEVICE_SERVICE_UUID = '6d696152-4421-8000-1005-000000000100'
export const DEVICE_STATUS_UUID = '6d696152-4421-8000-1005-000000000101'
export const PROTOCOL_INFO_UUID = '6d696152-4421-8000-1005-000000000103'
export const DATA_SERVICE_UUID = '6d696152-4421-8000-1005-000000000200'
export const DATA_FRAME_UUID = '6d696152-4421-8000-1005-000000000201'
export const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb'
export const BATTERY_LEVEL_UUID = '00002a19-0000-1000-8000-00805f9b34fb'

// Current protocol major version this app understands. See connect() flow in
// useDiscBle.js, which disconnects when Protocol Information reports a
// different major version.
export const SUPPORTED_PROTOCOL_MAJOR = 3

export const DATA_FRAME_SIZE = 152
export const SAMPLES_PER_FRAME = 12
const SAMPLE_SIZE = 12
const SAMPLES_OFFSET = 4
const PRESSURE_OFFSET = 148

// Frame-level status flags (apply to the whole 152-byte frame).
const FLAG_ACCEL_CLIPPED = 0x0001
const FLAG_GYRO_CLIPPED = 0x0002
const FLAG_PRESSURE_VALID = 0x0004
const FLAG_SAMPLE_MISSED = 0x0008
const FLAG_FRAME_DROPPED = 0x0010
const FLAG_IN_FLIGHT = 0x0020

// Device Status error flags.
const ERROR_LOW_BATTERY = 0x00000001

/**
 * rpm = sqrt(gx_raw² + gy_raw² + gz_raw²) / 24, where the raw values are the
 * signed quarter-degrees-per-second gyro readings straight off the wire.
 * The constant already folds in both the 0.25 dps/LSB scale and the
 * degrees->revolutions conversion, per BLE_PROTOCOL.md.
 */
export function rpmFromRaw(gxRaw, gyRaw, gzRaw) {
  return Math.sqrt(gxRaw * gxRaw + gyRaw * gyRaw + gzRaw * gzRaw) / 24
}

/**
 * Standard barometric formula, returning height above the baseline pressure
 * in meters (positive as pressure drops below the baseline, i.e. gaining
 * altitude). Returns 0 for a missing/invalid baseline instead of NaN.
 */
export function pressureToRelativeAltitudeM(pressurePa, baselinePressurePa) {
  if (!(baselinePressurePa > 0) || !Number.isFinite(pressurePa)) return 0
  return 44330 * (1 - Math.pow(pressurePa / baselinePressurePa, 1 / 5.255))
}

/**
 * Parses a 152-byte Data Frame notification into frame-level flags/pressure
 * plus its twelve IMU sub-samples.
 */
export function parseDataFrame(dataView) {
  const timestampMs = dataView.getUint16(0, true)
  const flags = dataView.getUint16(2, true)

  const samples = []
  for (let i = 0; i < SAMPLES_PER_FRAME; i++) {
    const base = SAMPLES_OFFSET + i * SAMPLE_SIZE
    const accelX_mg = dataView.getInt16(base + 0, true)
    const accelY_mg = dataView.getInt16(base + 2, true)
    const accelZ_mg = dataView.getInt16(base + 4, true)
    const gyroX_raw = dataView.getInt16(base + 6, true)
    const gyroY_raw = dataView.getInt16(base + 8, true)
    const gyroZ_raw = dataView.getInt16(base + 10, true)
    samples.push({
      accelX_mg,
      accelY_mg,
      accelZ_mg,
      gyroX_dps: gyroX_raw * 0.25,
      gyroY_dps: gyroY_raw * 0.25,
      gyroZ_dps: gyroZ_raw * 0.25,
      rpm: rpmFromRaw(gyroX_raw, gyroY_raw, gyroZ_raw),
    })
  }

  const pressurePa = dataView.getInt32(PRESSURE_OFFSET, true)

  return {
    timestampMs,
    flags,
    accelClipped: (flags & FLAG_ACCEL_CLIPPED) !== 0,
    gyroClipped: (flags & FLAG_GYRO_CLIPPED) !== 0,
    pressureValid: (flags & FLAG_PRESSURE_VALID) !== 0,
    sampleMissed: (flags & FLAG_SAMPLE_MISSED) !== 0,
    frameDropped: (flags & FLAG_FRAME_DROPPED) !== 0,
    inFlight: (flags & FLAG_IN_FLIGHT) !== 0,
    samples,
    pressurePa,
  }
}

/** Parses an 8-byte Device Status read/indication value. */
export function parseDeviceStatus(dataView) {
  const errorFlags = dataView.getUint32(0, true)
  const batteryMv = dataView.getUint16(4, true)
  const state = dataView.getUint8(6)
  return {
    errorFlags,
    lowBattery: (errorFlags & ERROR_LOW_BATTERY) !== 0,
    batteryMv,
    state,
  }
}

/** Parses a 24-byte Protocol Information read value. */
export function parseProtocolInfo(dataView) {
  const protocolMajor = dataView.getUint8(0)
  const protocolMinor = dataView.getUint8(1)
  const frameSize = dataView.getUint8(2)
  const samplesPerFrame = dataView.getUint8(3)

  let end = 4
  const maxEnd = Math.min(dataView.byteLength, 24)
  while (end < maxEnd && dataView.getUint8(end) !== 0) end++
  const bytes = []
  for (let i = 4; i < end; i++) bytes.push(dataView.getUint8(i))
  const firmwareVersion = String.fromCharCode(...bytes)

  return {
    protocolMajor,
    protocolMinor,
    frameSize,
    samplesPerFrame,
    firmwareVersion,
  }
}
