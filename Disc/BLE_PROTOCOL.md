# SmartDisc BLE Protocol

This is the authoritative app-facing contract for SmartDisc telemetry protocol
3.0.

- All multibyte integers are little-endian.
- Values use fixed-point integer units; there are no floating-point fields.
- Parse by byte offset. Do not cast incoming bytes to a native platform struct.

## Connection

- Advertised name: `SmartDisc`
- Discovery PHY: 1M
- Pairing: LE Secure Connections, Just Works, bonding enabled
- Maximum simultaneous connections: one
- Required ATT MTU: at least 155 bytes
- Device ATT MTU: 247 bytes
- Stationary PHY: 2M
- In-flight PHY: Coded S2
- Requested connection interval: 50 ms

Match scans on the Device Service UUID rather than relying only on the local
name.

## Services and UUIDs

Device Service:

- Service: `6d696152-4421-8000-1005-000000000100`
- Device Status: `6d696152-4421-8000-1005-000000000101`
- Configuration: `6d696152-4421-8000-1005-000000000102`
- Protocol Information: `6d696152-4421-8000-1005-000000000103`

Data Service:

- Service: `6d696152-4421-8000-1005-000000000200`
- Data Frame: `6d696152-4421-8000-1005-000000000201`

The standard Device Information Service (`0x180A`), Battery Service (`0x180F`),
and MCUmgr SMP service are also present.

## Data Frame

Data Frame is an encrypted notify characteristic. Enabling its CCC starts live
streaming; disabling the CCC stops streaming.

The device sends one 152-byte frame every 50 ms. Each frame contains twelve
consecutive 240 Hz IMU samples and the most recent 20 Hz pressure sample.

Byte layout:

- Offset 0, `uint16_t timestamp_ms`: uptime at the first IMU sample
- Offset 2, `uint16_t flags`: frame status flags
- Offset 4, 144 bytes: twelve IMU samples
- Offset 148, `int32_t pressure_pa`: absolute pressure in pascals

Each 12-byte IMU sample starts at `4 + 12 * sample_index`:

- Sample offset 0, `int16_t accel_x_mg`
- Sample offset 2, `int16_t accel_y_mg`
- Sample offset 4, `int16_t accel_z_mg`
- Sample offset 6, `int16_t gyro_x_qdps`
- Sample offset 8, `int16_t gyro_y_qdps`
- Sample offset 10, `int16_t gyro_z_qdps`

Acceleration uses 1 mg per LSB. Angular rate uses 0.25 degrees per second per
LSB. The IMU is configured for ±16 g and ±4000 dps.

There is no frame version, sequence number, or RPM field. Protocol version is
read from Protocol Information. A single 16-bit timestamp replaces both a full
timestamp and sequence counter: calculate elapsed time with unsigned 16-bit
subtraction. It wraps every 65.536 seconds. A timestamp jump greater than the
nominal 50 ms reveals lost or delayed frames.

Calculate RPM from angular-rate magnitude:

`rpm = sqrt(gx_dps² + gy_dps² + gz_dps²) / 6`

Equivalently, using the raw quarter-dps values:

`rpm = sqrt(gx_raw² + gy_raw² + gz_raw²) / 24`

Frame flags:

- `0x0001`: accelerometer clipped
- `0x0002`: gyroscope clipped
- `0x0004`: pressure value valid
- `0x0008`: an IMU sample interval was missed
- `0x0010`: at least one telemetry frame was dropped by the device TX queue
- `0x0020`: disc is in flight

Ignore currently undefined flag bits.

## Device Status

Device Status is an encrypted read/indicate characteristic. Subscribe to
indications to receive state, battery, and error changes.

Eight-byte layout:

- Offset 0, `uint32_t error_flags`
- Offset 4, `uint16_t battery_mv`
- Offset 6, `uint8_t state`
- Offset 7, `uint8_t reserved`, currently zero

Error flags:

- `0x00000001`: low battery
- `0x00000002`: IMU not ready
- `0x00000004`: barometer not ready
- `0x00000008`: IMU I/O error
- `0x00000010`: barometer I/O error
- `0x00000020`: accelerometer clipping
- `0x00000040`: gyroscope clipping
- `0x00000080`: device BLE TX queue overrun
- `0x00000100`: DFU start rejected because battery is too low
- `0x00000200`: configuration write rejected
- `0x00000400`: battery monitor unavailable

Device states:

- `0`: booting
- `1`: sensor standby
- `2`: ready
- `3`: streaming
- `4`: in flight
- `5`: DFU
- `6`: powering off

## Configuration

Configuration is an encrypted read/write/notify characteristic.

The eight-byte read/notification value is:

- Offset 0, `uint16_t imu_rate_hz`
- Offset 2, `uint16_t sensor_idle_timeout_ms`
- Offset 4, `uint8_t samples_per_frame`
- Offset 5, `uint8_t streaming`
- Offsets 6–7: reserved, currently zero

Each write should contain one TLV: `type uint8_t`, `length uint8_t`, then
`length` value bytes. The current firmware also accepts sequential TLVs, but
send separate writes when an all-or-nothing transaction is required.

- Type `0x01`, length 1: streaming; value 0 stops and 1 starts
- Type `0x02`, length 2: IMU rate in Hz
- Type `0x03`, length 1: samples per frame
- Type `0x04`, length 2: sensor standby timeout in milliseconds
- Type `0x06`, length 0: enter System OFF

The initial firmware has fixed compile-time sampling parameters. Writes for
types `0x02` through `0x04` succeed only when the value matches the active
configuration. Unsupported or malformed writes fail and set the configuration
error flag.

## Protocol Information

Protocol Information is a read characteristic that does not require pairing,
allowing compatibility checks before the app subscribes.

The 24-byte value is:

- Offset 0, `uint8_t protocol_major`
- Offset 1, `uint8_t protocol_minor`
- Offset 2, `uint8_t frame_size`
- Offset 3, `uint8_t samples_per_frame`
- Offset 4, 20-byte NUL-terminated firmware version buffer

The current protocol is 3.0, frame size is 152, and samples per frame is 12.

## Battery Service

The standard Battery Level characteristic reports an approximate percentage.
Device Status carries the measured millivolts and should be used for diagnostics.
The firmware samples VDD at boot and every 60 seconds.

## FOTA

Firmware updates use MCUmgr SMP over BLE. SMP requires an encrypted connection.
The phone must upload the sysbuild-generated DFU package.

An upload can start only when the measured battery is at least 2.5 V. Sensors
and telemetry stop for the transfer. The link requests 2M PHY and zero
peripheral latency.

MCUboot verifies image integrity but not a vendor signature. Compatible
hash-only images, including independently developed firmware, are accepted.

## Typical app flow

1. Scan for the Device Service UUID.
2. Connect and pair when requested.
3. Read Protocol Information and require a compatible major version.
4. Request or accept an ATT MTU of at least 155.
5. Read Configuration and Device Status.
6. Subscribe to Device Status indications.
7. Subscribe to Data Frame notifications; this starts streaming.
8. Parse only complete 152-byte notifications.
9. Unsubscribe from Data Frame to stop streaming.

Subscriptions are restored by the phone after reconnecting. A short Button 0
press enters System OFF; pressing it again performs a cold boot. Holding Button
0 for two seconds clears bonds.
