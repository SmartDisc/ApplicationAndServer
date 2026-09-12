import { ref } from 'vue'
import jsQR from 'jsqr'

// Frames are decoded at this cadence rather than on every animation frame —
// jsQR's search is the expensive part, and a QR code doesn't move fast enough
// on screen to need 60 decodes/second.
const DECODE_INTERVAL_MS = 150

/**
 * Drives a live QR scan against a `<video>` element using getUserMedia + jsQR.
 * Deliberately plugin-free: Capacitor's WebView already forwards getUserMedia
 * permission prompts to the OS as long as the native camera permission is
 * declared (see AndroidManifest.xml / Info.plist), so no native barcode plugin
 * is needed just to point the camera at a QR code and decode pixels.
 */
export function useQrScanner() {
  const scanning = ref(false)
  const error = ref(null)

  let stream = null
  let videoEl = null
  let canvas = null
  let canvasCtx = null
  let rafId = null
  let lastDecodeAt = 0
  let onDecodeCallback = null

  function tick() {
    if (!videoEl || videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA) {
      rafId = requestAnimationFrame(tick)
      return
    }

    const now = performance.now()
    if (now - lastDecodeAt >= DECODE_INTERVAL_MS) {
      lastDecodeAt = now
      canvas.width = videoEl.videoWidth
      canvas.height = videoEl.videoHeight
      canvasCtx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
      const frame = canvasCtx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(frame.data, frame.width, frame.height)
      if (code?.data) {
        onDecodeCallback?.(code.data)
      }
    }

    rafId = requestAnimationFrame(tick)
  }

  /** Starts the camera on `video` and calls `onDecode(text)` for every frame a QR code is found in. */
  async function start(video, onDecode) {
    stop()
    error.value = null
    onDecodeCallback = onDecode
    videoEl = video
    canvas = document.createElement('canvas')
    canvasCtx = canvas.getContext('2d', { willReadFrequently: true })

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
    } catch (err) {
      error.value = err
      return
    }

    videoEl.srcObject = stream
    await videoEl.play()
    scanning.value = true
    lastDecodeAt = 0
    rafId = requestAnimationFrame(tick)
  }

  /** Stops the scan loop and releases the camera. Safe to call repeatedly. */
  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    if (videoEl) videoEl.srcObject = null
    videoEl = null
    onDecodeCallback = null
    scanning.value = false
  }

  return { scanning, error, start, stop }
}
