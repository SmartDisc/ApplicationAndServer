<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps({
  series: { type: Array, default: () => [] },
  durationMs: { type: Number, default: null },
})

const { t } = useI18n()

const W = 300
const H = 160
const PAD_X = 16
const PAD_Y = 20
const DISC_RX = 15
const DISC_RY = 5.5

// Symmetric moving average (window of 5, clamped at the edges) to smooth out
// sensor jitter into a cleaner arc. Skipped for short/sparse recordings so we
// don't flatten the little real signal they have, and the first/last samples
// are always left untouched so release/catch stay anchored to real data.
function smoothAltitudes(pts) {
  const raw = pts.map(p => p.altM)
  const n = raw.length
  if (n < 8) return raw
  const halfWindow = 2
  const out = raw.slice()
  for (let i = 1; i < n - 1; i++) {
    const lo = Math.max(0, i - halfWindow)
    const hi = Math.min(n - 1, i + halfWindow)
    let sum = 0
    for (let j = lo; j <= hi; j++) sum += raw[j]
    out[i] = sum / (hi - lo + 1)
  }
  return out
}

// Same normalization the existing altitude chart uses (see SdThrowChart.vue):
// x = time fraction, y = altitude inverted so it arcs upward on screen.
const points = computed(() => {
  const pts = props.series
  if (!pts?.length) return []
  const tMax = pts[pts.length - 1].tMs || 1
  const alts = smoothAltitudes(pts)
  let aMin = Math.min(...alts)
  let aMax = Math.max(...alts)
  if (aMin === aMax) {
    aMin -= 1
    aMax += 1
  }
  return pts.map((p, i) => ({
    tMs: p.tMs,
    x: PAD_X + (p.tMs / tMax) * (W - PAD_X * 2),
    y: PAD_Y + (1 - (alts[i] - aMin) / (aMax - aMin)) * (H - PAD_Y * 2),
  }))
})

const pathD = computed(() =>
  points.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
)

const releasePoint = computed(() => points.value[0] ?? null)
const catchPoint = computed(() => points.value[points.value.length - 1] ?? null)

// ── Disc-in-flight animation ────────────────────────────────────────────────
const discPos = ref(null)
const discAngle = ref(0)
const discWobble = ref(1)
const discScale = ref(1)
const animating = ref(false)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// The path mixes time (x) and altitude (y), so constant arc-length speed
// doesn't track real elapsed time (it visibly drags near the flat apex).
// Interpolating on the same tMs/tMax fraction used to place the points makes
// on-screen speed match the actual recorded timing instead.
function interpolateAtProgress(progress) {
  const pts = points.value
  const tMax = pts[pts.length - 1].tMs || 1
  const targetT = progress * tMax

  if (targetT <= pts[0].tMs) return { x: pts[0].x, y: pts[0].y }
  for (let i = 1; i < pts.length; i++) {
    if (targetT <= pts[i].tMs) {
      const p0 = pts[i - 1]
      const p1 = pts[i]
      const span = p1.tMs - p0.tMs || 1
      const frac = (targetT - p0.tMs) / span
      return {
        x: p0.x + (p1.x - p0.x) * frac,
        y: p0.y + (p1.y - p0.y) * frac,
      }
    }
  }
  const last = pts[pts.length - 1]
  return { x: last.x, y: last.y }
}

// A ~1s hold at both ends of the loop reads as two beats (the "ready to
// throw" pause and the throw "landing") rather than either an abrupt launch
// or an abrupt jump back to release.
const HOLD_MS = 1000

let rafId = null
let pauseTimer = null
let stopped = false

// Settles the disc at a given flight progress (0 = release) using the same
// interpolation the flight loop uses, so the resting pose faces the actual
// direction of travel instead of defaulting to angle 0.
function settleAtProgress(progress) {
  const p = interpolateAtProgress(progress)
  const ahead = interpolateAtProgress(Math.min(progress + 0.015, 1))
  discPos.value = { x: p.x, y: p.y }
  discAngle.value = Math.atan2(ahead.y - p.y, ahead.x - p.x) * (180 / Math.PI)
  discWobble.value = 1
  discScale.value = 1
}

function playFlight() {
  const pts = points.value
  if (!pts.length || stopped) return

  if (prefersReducedMotion()) {
    // Skip the flight animation entirely, just settle the disc at the catch point.
    const end = pts[pts.length - 1]
    discPos.value = { x: end.x, y: end.y }
    discAngle.value = 0
    return
  }

  settleAtProgress(0)
  pauseTimer = setTimeout(() => {
    if (!stopped) flyToCatch()
  }, HOLD_MS)
}

function flyToCatch() {
  const pts = points.value
  if (!pts.length || stopped) return

  const ys = pts.map(p => p.y)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)

  animating.value = true
  const durationMsAnim = 1700
  const lookAhead = 0.015
  const start = performance.now()

  function frame(now) {
    if (stopped) return
    const elapsed = now - start
    const progress = Math.min(elapsed / durationMsAnim, 1)

    const p = interpolateAtProgress(progress)
    const ahead = interpolateAtProgress(Math.min(progress + lookAhead, 1))
    const tilt = Math.atan2(ahead.y - p.y, ahead.x - p.x) * (180 / Math.PI)
    // Higher up (smaller y, nearer the apex) reads as further from the
    // camera, so shrink the disc slightly as it climbs.
    const heightFrac = yMax > yMin ? (yMax - p.y) / (yMax - yMin) : 0

    discPos.value = { x: p.x, y: p.y }
    discAngle.value = tilt
    // Spin wobble layered on top of the flight tilt, to read as a spinning
    // disc rather than a dot sliding along the path.
    discWobble.value = Math.cos(progress * Math.PI * 18)
    discScale.value = 1 - 0.14 * heightFrac

    if (progress < 1) {
      rafId = requestAnimationFrame(frame)
    } else {
      animating.value = false
      pauseTimer = setTimeout(() => {
        if (!stopped) playFlight()
      }, HOLD_MS)
    }
  }

  rafId = requestAnimationFrame(frame)
}

// Always tears down whatever is currently pending (flight frame or either
// hold timer) before restarting, so a click never leaves two loops racing.
function replay() {
  if (rafId != null) cancelAnimationFrame(rafId)
  rafId = null
  clearTimeout(pauseTimer)
  animating.value = false
  playFlight()
}

onMounted(() => {
  nextTick(playFlight)
})

onUnmounted(() => {
  stopped = true
  if (rafId != null) cancelAnimationFrame(rafId)
  clearTimeout(pauseTimer)
})
</script>

<template>
  <div v-if="series?.length" class="flight-chart" @click="replay">
    <div class="flight-chart__head">
      <span class="flight-chart__title">{{ t('discs.throwDetail.flightPath.title') }}</span>
    </div>
    <svg
      class="flight-chart__svg"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sd-flight-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="var(--sd-gold-300)" />
          <stop offset="100%" stop-color="var(--sd-ink-300)" />
        </linearGradient>
        <linearGradient id="sd-disc-gradient" x1="30%" y1="0%" x2="75%" y2="100%">
          <stop offset="0%" stop-color="var(--sd-fg-on-dark)" />
          <stop offset="55%" stop-color="var(--sd-fg-on-dark)" />
          <stop offset="100%" stop-color="var(--sd-ink-300)" />
        </linearGradient>
        <filter id="sd-disc-shadow" x="-80%" y="-120%" width="260%" height="320%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="var(--sd-ink-900)" flood-opacity="0.45" />
        </filter>
      </defs>

      <line
        v-for="frac in [0, 0.33, 0.66, 1]"
        :key="`h-${frac}`"
        class="flight-chart__grid"
        :x1="0" :x2="W"
        :y1="PAD_Y + frac * (H - PAD_Y * 2)"
        :y2="PAD_Y + frac * (H - PAD_Y * 2)"
      />
      <line
        v-for="frac in [0, 0.25, 0.5, 0.75, 1]"
        :key="`v-${frac}`"
        class="flight-chart__grid"
        :x1="PAD_X + frac * (W - PAD_X * 2)" :x2="PAD_X + frac * (W - PAD_X * 2)"
        :y1="0" :y2="H"
      />

      <path
        :d="pathD"
        class="flight-chart__path"
        stroke="url(#sd-flight-gradient)"
        fill="none"
      />

      <circle
        v-if="releasePoint"
        class="flight-chart__dot flight-chart__dot--release"
        :cx="releasePoint.x" :cy="releasePoint.y" r="5"
      />
      <circle
        v-if="catchPoint"
        class="flight-chart__dot flight-chart__dot--catch"
        :cx="catchPoint.x" :cy="catchPoint.y" r="5"
      />

      <g
        v-if="discPos"
        class="flight-chart__disc"
        filter="url(#sd-disc-shadow)"
        :style="{ transform: `translate(${discPos.x}px, ${discPos.y}px) rotate(${discAngle}deg) scale(${discScale}) scaleY(${0.55 + 0.15 * discWobble})` }"
      >
        <ellipse cx="0" cy="0" :rx="DISC_RX + 1.5" :ry="DISC_RY + 1.2" class="flight-chart__disc-rim" />
        <ellipse :cy="DISC_RY * 0.5" :rx="DISC_RX * 0.95" :ry="DISC_RY * 0.75" class="flight-chart__disc-underside" />
        <ellipse cx="0" cy="0" :rx="DISC_RX" :ry="DISC_RY" class="flight-chart__disc-body" />
        <ellipse :cx="-DISC_RX * 0.3" :cy="-DISC_RY * 0.35" :rx="DISC_RX * 0.35" :ry="DISC_RY * 0.3" class="flight-chart__disc-highlight" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.flight-chart {
  position: relative;
  padding: 16px;
  border-radius: var(--sd-r-md);
  background: rgba(255, 255, 255, .06);
  border: 1px solid rgba(255, 255, 255, .10);
  cursor: pointer;
}

.flight-chart__svg {
  width: 100%;
  height: 160px;
  display: block;
  overflow: visible;
}

.flight-chart__grid {
  stroke: rgba(182, 198, 221, .12);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.flight-chart__path {
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.flight-chart__dot {
  stroke: var(--sd-ink-900);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
.flight-chart__dot--release {
  fill: var(--sd-gold-300);
}
.flight-chart__dot--catch {
  fill: var(--sd-fg-on-dark);
}

.flight-chart__disc {
  /* fill-box + centered origin so rotate/scale pivot on the group's own
     center (0,0), which sits at that center by construction. */
  transform-box: fill-box;
  transform-origin: 50% 50%;
}
.flight-chart__disc-rim {
  fill: var(--sd-ink-700);
  opacity: 0.55;
}
.flight-chart__disc-underside {
  fill: var(--sd-ink-500);
  opacity: 0.8;
}
.flight-chart__disc-body {
  fill: url(#sd-disc-gradient);
}
.flight-chart__disc-highlight {
  fill: var(--sd-fg-on-dark);
  opacity: 0.6;
}

.flight-chart__head {
  margin-bottom: 6px;
}

.flight-chart__title {
  font-family: var(--sd-font-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--sd-fg2-on-dark);
}

@media (prefers-reduced-motion: reduce) {
  .flight-chart__disc {
    transition: none;
  }
}
</style>
