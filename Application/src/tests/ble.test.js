import { describe, it, expect } from 'vitest'
import {
  DEVICE_SERVICE_UUID,
  DEVICE_STATUS_UUID,
  PROTOCOL_INFO_UUID,
  DATA_SERVICE_UUID,
  DATA_FRAME_UUID,
  BATTERY_SERVICE_UUID,
  BATTERY_LEVEL_UUID,
  parseDataFrame,
  parseDeviceStatus,
  parseProtocolInfo,
  rpmFromRaw,
  pressureToRelativeAltitudeM,
} from '../services/ble.js'
import { useDiscBle } from '../composables/useDiscBle.js'

// --- fixture builders --------------------------------------------------

/** Builds a 152-byte Data Frame DataView. `samples` overrides sample[i]. */
function buildDataFrame({
  timestampMs = 0,
  flags = 0x0004, // pressure valid
  pressurePa = 101325,
  samples = {},
} = {}) {
  const buf = new ArrayBuffer(152)
  const view = new DataView(buf)
  view.setUint16(0, timestampMs, true)
  view.setUint16(2, flags, true)
  for (let i = 0; i < 12; i++) {
    const base = 4 + i * 12
    const s = samples[i] || {}
    view.setInt16(base + 0, s.accelX_mg ?? 0, true)
    view.setInt16(base + 2, s.accelY_mg ?? 0, true)
    view.setInt16(base + 4, s.accelZ_mg ?? 0, true)
    view.setInt16(base + 6, s.gyroX_raw ?? 0, true)
    view.setInt16(base + 8, s.gyroY_raw ?? 0, true)
    view.setInt16(base + 10, s.gyroZ_raw ?? 0, true)
  }
  view.setInt32(148, pressurePa, true)
  return view
}

function buildDeviceStatus({ errorFlags = 0, batteryMv = 3700, state = 2, reserved = 0 } = {}) {
  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  view.setUint32(0, errorFlags, true)
  view.setUint16(4, batteryMv, true)
  view.setUint8(6, state)
  view.setUint8(7, reserved)
  return view
}

function buildProtocolInfo({
  protocolMajor = 3,
  protocolMinor = 0,
  frameSize = 152,
  samplesPerFrame = 12,
  firmwareVersion = '2.0.0-sim',
} = {}) {
  const buf = new ArrayBuffer(24)
  const view = new DataView(buf)
  view.setUint8(0, protocolMajor)
  view.setUint8(1, protocolMinor)
  view.setUint8(2, frameSize)
  view.setUint8(3, samplesPerFrame)
  for (let i = 0; i < 20; i++) {
    const code = i < firmwareVersion.length ? firmwareVersion.charCodeAt(i) : 0
    view.setUint8(4 + i, code)
  }
  return view
}

// --- UUID constants ------------------------------------------------------

describe('UUID constants', () => {
  it('exposes the protocol UUIDs from BLE_PROTOCOL.md', () => {
    expect(DEVICE_SERVICE_UUID).toBe('6d696152-4421-8000-1005-000000000100')
    expect(DEVICE_STATUS_UUID).toBe('6d696152-4421-8000-1005-000000000101')
    expect(PROTOCOL_INFO_UUID).toBe('6d696152-4421-8000-1005-000000000103')
    expect(DATA_SERVICE_UUID).toBe('6d696152-4421-8000-1005-000000000200')
    expect(DATA_FRAME_UUID).toBe('6d696152-4421-8000-1005-000000000201')
    expect(BATTERY_SERVICE_UUID).toBe('0000180f-0000-1000-8000-00805f9b34fb')
    expect(BATTERY_LEVEL_UUID).toBe('00002a19-0000-1000-8000-00805f9b34fb')
  })
})

// --- rpmFromRaw ------------------------------------------------------------

describe('rpmFromRaw', () => {
  it('is zero when the disc is stationary', () => {
    expect(rpmFromRaw(0, 0, 0)).toBe(0)
  })
  it('matches sqrt(gx²+gy²+gz²)/24 on a single-axis spin', () => {
    // 2400 raw (quarter-dps) = 600 dps on one axis -> 100 rpm
    expect(rpmFromRaw(2400, 0, 0)).toBe(100)
  })
  it('combines all three axes', () => {
    expect(rpmFromRaw(3, 4, 0)).toBeCloseTo(0.20833333333333334, 10)
  })
  it('is insensitive to sign (magnitude only)', () => {
    expect(rpmFromRaw(-2400, 0, 0)).toBe(100)
  })
})

// --- pressureToRelativeAltitudeM -------------------------------------------

describe('pressureToRelativeAltitudeM', () => {
  it('is ~0 at the baseline pressure', () => {
    expect(pressureToRelativeAltitudeM(101325, 101325)).toBeCloseTo(0, 6)
  })
  it('is positive as pressure drops below the baseline (gaining height)', () => {
    expect(pressureToRelativeAltitudeM(100000, 101325)).toBeCloseTo(110.90104538806403, 6)
  })
  it('grows further for a bigger pressure drop', () => {
    expect(pressureToRelativeAltitudeM(50000, 101325)).toBeCloseTo(5575.209043152499, 6)
  })
  it('is negative when pressure rises above the baseline', () => {
    expect(pressureToRelativeAltitudeM(102000, 101325)).toBeLessThan(0)
  })
  it('returns 0 instead of throwing/NaN for an invalid baseline', () => {
    expect(pressureToRelativeAltitudeM(100000, 0)).toBe(0)
    expect(pressureToRelativeAltitudeM(100000, -5)).toBe(0)
    expect(pressureToRelativeAltitudeM(100000, NaN)).toBe(0)
  })
  it('returns 0 instead of throwing/NaN for an invalid pressure reading', () => {
    expect(pressureToRelativeAltitudeM(NaN, 101325)).toBe(0)
  })
})

// --- parseDataFrame ----------------------------------------------------

describe('parseDataFrame', () => {
  it('parses an at-rest frame (INSTRUCTIONS.md worked example: ~1000 mg on one axis, gyro ~0)', () => {
    const view = buildDataFrame({
      timestampMs: 1234,
      flags: 0x0004, // pressure valid, matches the "usually 0x0004 at rest" note
      pressurePa: 101325,
      samples: { 0: { accelX_mg: 1000, accelY_mg: 0, accelZ_mg: 0 } },
    })
    const frame = parseDataFrame(view)

    expect(frame.timestampMs).toBe(1234)
    expect(frame.flags).toBe(0x0004)
    expect(frame.accelClipped).toBe(false)
    expect(frame.gyroClipped).toBe(false)
    expect(frame.pressureValid).toBe(true)
    expect(frame.sampleMissed).toBe(false)
    expect(frame.frameDropped).toBe(false)
    expect(frame.inFlight).toBe(false)
    expect(frame.pressurePa).toBe(101325)
    expect(frame.samples).toHaveLength(12)
    expect(frame.samples[0]).toEqual({
      accelX_mg: 1000,
      accelY_mg: 0,
      accelZ_mg: 0,
      gyroX_dps: 0,
      gyroY_dps: 0,
      gyroZ_dps: 0,
      rpm: 0,
    })
    // every other sample defaults to all zero
    expect(frame.samples[1]).toEqual({
      accelX_mg: 0, accelY_mg: 0, accelZ_mg: 0,
      gyroX_dps: 0, gyroY_dps: 0, gyroZ_dps: 0, rpm: 0,
    })
  })

  it('decodes every frame flag bit independently', () => {
    const allFlags = 0x0001 | 0x0002 | 0x0004 | 0x0008 | 0x0010 | 0x0020
    const frame = parseDataFrame(buildDataFrame({ flags: allFlags }))
    expect(frame.accelClipped).toBe(true)
    expect(frame.gyroClipped).toBe(true)
    expect(frame.pressureValid).toBe(true)
    expect(frame.sampleMissed).toBe(true)
    expect(frame.frameDropped).toBe(true)
    expect(frame.inFlight).toBe(true)
  })

  it('ignores undefined flag bits', () => {
    const frame = parseDataFrame(buildDataFrame({ flags: 0xff00 }))
    expect(frame.accelClipped).toBe(false)
    expect(frame.gyroClipped).toBe(false)
    expect(frame.pressureValid).toBe(false)
    expect(frame.sampleMissed).toBe(false)
    expect(frame.frameDropped).toBe(false)
    expect(frame.inFlight).toBe(false)
  })

  it('parses a spinning last sample (in-flight) with correct rpm and byte offsets', () => {
    const view = buildDataFrame({
      flags: 0x0004 | 0x0020,
      pressurePa: 98000,
      samples: {
        11: {
          accelX_mg: 100, accelY_mg: -200, accelZ_mg: 300,
          gyroX_raw: 2400, gyroY_raw: 0, gyroZ_raw: 0,
        },
      },
    })
    const frame = parseDataFrame(view)
    expect(frame.inFlight).toBe(true)
    expect(frame.pressurePa).toBe(98000)
    const last = frame.samples[11]
    expect(last.accelX_mg).toBe(100)
    expect(last.accelY_mg).toBe(-200)
    expect(last.accelZ_mg).toBe(300)
    expect(last.gyroX_dps).toBe(600) // 2400 raw * 0.25 dps/LSB
    expect(last.gyroY_dps).toBe(0)
    expect(last.gyroZ_dps).toBe(0)
    expect(last.rpm).toBe(100)
    // sample 10 untouched, still zero
    expect(frame.samples[10].accelX_mg).toBe(0)
  })

  it('reads a negative absolute pressure delta correctly (signed int32)', () => {
    const frame = parseDataFrame(buildDataFrame({ pressurePa: -5 }))
    expect(frame.pressurePa).toBe(-5)
  })
})

// --- parseDeviceStatus ---------------------------------------------------

describe('parseDeviceStatus', () => {
  it('parses a healthy streaming status (state 3 = streaming, per INSTRUCTIONS.md)', () => {
    const status = parseDeviceStatus(buildDeviceStatus({ errorFlags: 0, batteryMv: 4100, state: 3 }))
    expect(status.errorFlags).toBe(0)
    expect(status.lowBattery).toBe(false)
    expect(status.batteryMv).toBe(4100)
    expect(status.state).toBe(3)
  })

  it('flags low battery from bit 0x00000001', () => {
    const status = parseDeviceStatus(buildDeviceStatus({ errorFlags: 0x00000001, batteryMv: 3300, state: 2 }))
    expect(status.lowBattery).toBe(true)
    expect(status.batteryMv).toBe(3300)
  })

  it('does not confuse other error bits with low battery', () => {
    const status = parseDeviceStatus(buildDeviceStatus({ errorFlags: 0x00000020 })) // accel clipping
    expect(status.lowBattery).toBe(false)
    expect(status.errorFlags).toBe(0x00000020)
  })

  it('parses the in-flight state (4)', () => {
    const status = parseDeviceStatus(buildDeviceStatus({ state: 4 }))
    expect(status.state).toBe(4)
  })
})

// --- parseProtocolInfo ----------------------------------------------------

describe('parseProtocolInfo', () => {
  it('parses protocol 3.0, frame size 152, 12 samples/frame', () => {
    const info = parseProtocolInfo(buildProtocolInfo())
    expect(info.protocolMajor).toBe(3)
    expect(info.protocolMinor).toBe(0)
    expect(info.frameSize).toBe(152)
    expect(info.samplesPerFrame).toBe(12)
    expect(info.firmwareVersion).toBe('2.0.0-sim')
  })

  it('stops decoding the firmware string at the first NUL byte', () => {
    const info = parseProtocolInfo(buildProtocolInfo({ firmwareVersion: 'v1' }))
    expect(info.firmwareVersion).toBe('v1')
  })

  it('flags an incompatible major version', () => {
    const info = parseProtocolInfo(buildProtocolInfo({ protocolMajor: 2, firmwareVersion: '2.0.0-sim' }))
    expect(info.protocolMajor).not.toBe(3)
  })
})

// --- useDiscBle() smoke test ------------------------------------------

describe('useDiscBle()', () => {
  it('exposes the exact composable contract with correct initial values', () => {
    const ble = useDiscBle()

    // refs / computed present
    for (const key of [
      'connectionState', 'connectionErrorCode', 'isConnected', 'deviceName',
      'firmwareVersion', 'protocolCompatible', 'batteryPercent', 'deviceState',
      'lowBattery', 'isStreaming', 'latest', 'isRecording',
      'connect', 'disconnect', 'startRecording', 'stopRecording',
    ]) {
      expect(ble).toHaveProperty(key)
    }

    expect(ble.connectionState.value).toBe('disconnected')
    expect(ble.connectionErrorCode.value).toBeNull()
    expect(ble.isConnected.value).toBe(false)
    expect(ble.deviceName.value).toBeNull()
    expect(ble.firmwareVersion.value).toBeNull()
    expect(ble.protocolCompatible.value).toBeNull()
    expect(ble.batteryPercent.value).toBeNull()
    expect(ble.deviceState.value).toBeNull()
    expect(ble.lowBattery.value).toBe(false)
    expect(ble.isStreaming.value).toBe(false)
    expect(ble.latest.value).toBeNull()
    expect(ble.isRecording.value).toBe(false)

    expect(typeof ble.connect).toBe('function')
    expect(typeof ble.disconnect).toBe('function')
    expect(typeof ble.startRecording).toBe('function')
    expect(typeof ble.stopRecording).toBe('function')
  })

  it('creates independent state per call (no module-level singleton)', () => {
    const a = useDiscBle()
    const b = useDiscBle()
    a.connectionState.value = 'connecting'
    expect(b.connectionState.value).toBe('disconnected')
  })

  it('startRecording() is a no-op while disconnected', () => {
    const ble = useDiscBle()
    ble.startRecording()
    expect(ble.isRecording.value).toBe(false)
  })

  it('stopRecording() returns null when not recording', () => {
    const ble = useDiscBle()
    expect(ble.stopRecording()).toBeNull()
  })
})
