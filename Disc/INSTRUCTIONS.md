# SmartDisc dongle simulator — setup instructions

This guide is for **app developers** using an **nRF52840 USB Dongle** as a fake SmartDisc.
You only need **nrfutil** to flash firmware — no Nordic SDK required if you receive the
pre-built zip from firmware.

Technical details and build-from-source steps: `[README.md](README.md)`.

---

## What you need


| Item                | Notes                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nRF52840 USB Dongle | [Nordic PCA10059](https://www.nordicsemi.com/Products/Development-hardware/nRF52840-Dongle) — thumb-drive shape, **USB-A pads on the PCB** (plugs straight into a host port) |
| USB host port       | On your PC/laptop, or a **USB-A socket on a hub/adapter**                                                                                                                    |
| `smartdisc_sim.zip` | Pre-built firmware from the firmware team (`dongle_sim/build/smartdisc_sim.zip`)                                                                                             |
| nrfutil             | Nordic’s command-line tool (see below)                                                                                                                                       |
| Phone with BLE      | SmartDisc app and/or [nRF Connect for Mobile](https://www.nordicsemi.com/Products/Development-tools/nRF-Connect-for-mobile)                                                  |


The dongle advertises as `SmartDisc` and uses the same BLE protocol as the real disc.

## 1. Install nrfutil



### Arch Linux

```bash
yay -S nrfutil-bin
nrfutil install nrf5sdk-tools
```

Alternative: `npm install -g nrfutil` then `nrfutil install nrf5sdk-tools`.

### Windows

1. Install [nrfutil](https://www.nordicsemi.com/Products/Development-tools/nrf-util) and add it to your PATH.
2. Open PowerShell:

```powershell
nrfutil install nrf5sdk-tools
```

---



## 2. Flash the dongle



### Enter bootloader mode

1. Plug the dongle **directly into a USB-A port** on the PC (or into a USB-A socket on a hub/adapter).
2. Find the small **RESET** button on the narrow edge (push **toward** the USB plug).
3. Press RESET once.
4. The **red** LED should pulse slowly — the dongle is in bootloader mode.



### Run the flash command

Open a terminal in the folder where `smartdisc_sim.zip` is saved.

**Linux (Arch etc.)**

```bash
nrfutil nrf5sdk-tools dfu usb-serial -pkg smartdisc_sim.zip -p /dev/ttyACM0
```

If that fails, try `/dev/ttyACM1`. List ports:

```bash
ls /dev/ttyACM*
```

**Windows**

```powershell
nrfutil nrf5sdk-tools dfu usb-serial -pkg smartdisc_sim.zip -p COM3
```

Replace `COM3` with the port shown in **Device Manager → Ports (COM & LPT)** while the red LED is pulsing.

### Success

When flashing finishes, the **green** LED blinks — the simulator is running and advertising.

---



## 3. Inspect raw data with nRF Connect (before the app is ready)

Install **nRF Connect for Mobile** (iOS / Android). Use it to confirm the dongle
advertises, pairs, and streams bytes without writing app code yet.

1. Plug the dongle in for power. Green LED should blink (advertising).
2. Open nRF Connect → **Scanner** → tap **SCAN**.
3. Tap **SmartDisc** → **CONNECT**.
4. When prompted, **pair / bond** (Just Works — accept on both sides if Android asks twice).
5. Expand the custom services (128-bit UUIDs starting with `6d696152-4421-8000-1005-…`).



### GATT map (short reference)

Full wire format: `[../BLE_PROTOCOL.md](../BLE_PROTOCOL.md)` (protocol **3.0**).


| UUID suffix | Name                 | Properties          | Size      | Role                                         |
| ----------- | -------------------- | ------------------- | --------- | -------------------------------------------- |
| `…0100`     | Device Service       | —                   | —         | Parent service                               |
| `…0101`     | Device Status        | Read, Indicate      | 8 B       | State, battery mV, error flags               |
| `…0102`     | Configuration        | Read, Write, Notify | 8 B       | Stream on/off, reported rates                |
| `…0103`     | Protocol Information | Read                | 24 B      | Protocol 3.0, frame size 152, version string |
| `…0200`     | Data Service         | —                   | —         | Parent service                               |
| `…0201`     | **Data Frame**       | **Notify**          | **152 B** | **Live telemetry @ 20 Hz**                   |


Standard services also present: Device Information (`180A`), Battery (`180F`).

Characteristics `0101`–`0201` require an **encrypted** link (pair first). `0103` is
readable before pairing for version checks.

### What to enable in nRF Connect


| Step         | Characteristic           | Action                                                    |
| ------------ | ------------------------ | --------------------------------------------------------- |
| 1            | **Data Frame** (`…0201`) | Tap the **↓ notify** icon (three vertical bars) → **ON**  |
| 2 (optional) | Device Status (`…0101`)  | Enable **indicate** (one arrow) for state/battery updates |
| 3 (optional) | Configuration (`…0102`)  | Enable **notify** to see config snapshots                 |


After notify on **0201**, the **Log** tab at the bottom shows hex payloads ~20 times
per second.

**At rest (hex, first bytes):** timestamp `uint16`, then flags `uint16` — flags usually
include `0x0004` (baro valid). Accel ≈ `E8 03 00 00 00 00` (1000 mg on Z) in little-endian.

**During a throw:** flags gain `0x0020` (in flight); gyro bytes spike. Auto throw every
**~12 s** while notify stays on.

**Device Status byte 6 (state):** `3` = streaming, `4` = in flight (see protocol doc).

**Configuration notify (**`…0102`**):** static snapshot, e.g. `F0 00 88 13 0C 01 00 00` =
240 Hz, 5 s idle timeout, 12 samples/frame, streaming on — not flight state; use **0101**
or frame flags for that.

To stop streaming, turn **0201** notify off.

---



## 4. Use with the SmartDisc app

1. Open the app and scan for BLE devices.
2. Connect to **SmartDisc**.
3. Accept the pairing dialog (no PIN — “Just Works”).
4. Enable **notifications** on the **Data Frame** characteristic (`…0201`).
5. You should see telemetry at 20 Hz:
  - **At rest:** ~1000 mg on one accel axis, gyro near zero.
  - **Every ~12 s:** a simulated throw (gyro spike, in-flight flag, small pressure change).
6. **Optional:** short press the dongle **user button (SW1)** to trigger a throw immediately.



### Buttons


| Button                       | Action                                            |
| ---------------------------- | ------------------------------------------------- |
| **RESET** (edge, toward USB) | Bootloader mode for re-flashing                   |
| **USER / SW1**               | Short press = throw now · Hold ~2 s = clear bonds |




### Re-pairing

If pairing fails or the app behaves oddly:

1. Hold **USER** button for 2 seconds (bonds cleared on dongle).
2. On the phone: **Forget** “SmartDisc” in Bluetooth settings.
3. Scan and connect again.

---



## Troubleshooting


| Problem                        | What to do                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------- |
| No **SmartDisc** in scan       | Green LED blinking? If red is pulsing, firmware did not start — flash again.    |
| DFU timeout / wrong port       | Press RESET (red LED pulsing), then retry with the other `ttyACM` / `COM` port. |
| `Permission denied` (Linux)    | `sudo usermod -aG uucp,dialout $USER`, log out and back in.                     |
| Connected but no telemetry     | Enable notify on **0201** (Data Frame), not only other characteristics.         |
| Two pairing dialogs on Android | Accept both, or clear bonds (hold button) and forget device on phone.           |


---



## What the simulator does

- Same GATT services and 152-byte telemetry frames as production firmware.
- Link PHY: **2M** at rest, **Coded S2** during simulated throw (release → landing).
- Simulated throw: rest → windup → release → **in-flight** (~3.5 s, ~700 °/s spin) → landing → rest.
- Auto throw every **12 seconds** while streaming.
- Firmware version in Protocol Info: `2.0.0-sim`.

**Protocol reference:** `[../BLE_PROTOCOL.md](../BLE_PROTOCOL.md)` — UUIDs, byte layouts, frame flags, TLV config writes, and typical app flow.