<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import SdStatTile from '@/components/ui/SdStatTile.vue'
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
const BASELINE_Y = H - PAD_Y

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

const tMax = computed(() => props.series?.length ? (props.series[props.series.length - 1].tMs || 1) : 1)

// Same normalization the existing altitude chart uses (see SdThrowChart.vue):
// x = time fraction, y = altitude inverted so it arcs upward on screen. Each
// point also keeps its (smoothed) altitude and raw rpm so the flight
// animation can read live values off the same series it draws.
const points = computed(() => {
  const pts = props.series
  if (!pts?.length) return []
  const alts = smoothAltitudes(pts)
  let aMin = Math.min(...alts)
  let aMax = Math.max(...alts)
  if (aMin === aMax) {
    aMin -= 1
    aMax += 1
  }
  return pts.map((p, i) => ({
    tMs: p.tMs,
    altM: alts[i],
    rpm: p.rpm,
    x: PAD_X + (p.tMs / tMax.value) * (W - PAD_X * 2),
    y: PAD_Y + (1 - (alts[i] - aMin) / (aMax - aMin)) * (H - PAD_Y * 2),
  }))
})

const pathD = computed(() =>
  points.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
)

const releasePoint = computed(() => points.value[0] ?? null)

const peakPoint = computed(() => {
  const pts = points.value
  if (!pts.length) return null
  return pts.reduce((a, b) => (b.altM > a.altM ? b : a))
})
const peakProgress = computed(() => (peakPoint.value ? peakPoint.value.tMs / tMax.value : 0))
const peakLabelText = computed(() =>
  peakPoint.value ? `${peakPoint.value.altM.toFixed(1)} m ${t('discs.throwDetail.flightPath.peak')}` : ''
)

// ── Disc-in-flight animation ────────────────────────────────────────────────
const discPos = ref(null)
const discAngle = ref(0)
const discWobble = ref(1)
const discScale = ref(1)
const animating = ref(false)
// Time-fraction (0 = release, 1 = catch) behind the animation currently on
// screen. Drives the progressive trail reveal, the peak marker, and the live
// height/spin readout so they all stay in lockstep with the disc dot.
const flightProgress = ref(0)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// The path mixes time (x) and altitude (y), so constant arc-length speed
// doesn't track real elapsed time (it visibly drags near the flat apex).
// Interpolating on the same tMs/tMax fraction used to place the points makes
// on-screen speed match the actual recorded timing instead, and carries
// altM/rpm along so the live stat tiles read off the exact same sample.
function interpolateAtProgress(progress) {
  const pts = points.value
  const targetT = progress * tMax.value

  if (targetT <= pts[0].tMs) return { ...pts[0] }
  for (let i = 1; i < pts.length; i++) {
    if (targetT <= pts[i].tMs) {
      const p0 = pts[i - 1]
      const p1 = pts[i]
      const span = p1.tMs - p0.tMs || 1
      const frac = (targetT - p0.tMs) / span
      return {
        x: p0.x + (p1.x - p0.x) * frac,
        y: p0.y + (p1.y - p0.y) * frac,
        altM: p0.altM + (p1.altM - p0.altM) * frac,
        rpm: p0.rpm + (p1.rpm - p0.rpm) * frac,
      }
    }
  }
  return { ...pts[pts.length - 1] }
}

const liveSample = computed(() =>
  points.value.length ? interpolateAtProgress(flightProgress.value) : null
)
const heightLabel = computed(() => (liveSample.value ? liveSample.value.altM.toFixed(1) : '0.0'))
const spinLabel = computed(() => (liveSample.value ? `${Math.round(liveSample.value.rpm)}` : '0'))
const scrubTimeLabel = computed(() =>
  liveSample.value ? `${((flightProgress.value * tMax.value) / 1000).toFixed(2)}s` : ''
)

// Reveals the gold trail up to wherever the disc currently is; a dimmer
// "ghost" copy of the same path stays underneath so the rest of the arc is
// still visible as a preview of where the throw is headed.
const revealWidth = computed(() => (discPos.value ? discPos.value.x : 0))

// Tracks straight down from the disc while it's still climbing, then locks
// onto the actual peak once the disc has flown past it (and reveals the
// "peak" label at that point) rather than continuing to chase the disc.
const pastPeak = computed(() => !!peakPoint.value && flightProgress.value >= peakProgress.value - 0.0001)
const trackerPoint = computed(() => {
  if (pastPeak.value) return peakPoint.value
  return discPos.value ?? releasePoint.value
})
const peakTagStyle = computed(() => {
  if (!pastPeak.value || !peakPoint.value) return {}
  const nearTop = peakPoint.value.y / H < 0.3
  return {
    left: `${(peakPoint.value.x / W) * 100}%`,
    top: nearTop ? `${(peakPoint.value.y / H) * 100}%` : undefined,
    bottom: nearTop ? undefined : `${(1 - peakPoint.value.y / H) * 100}%`,
    transform: `translate(-50%, ${nearTop ? '10px' : '-10px'})`,
  }
})

// Floats above (or below, if the touch point is near the top edge) wherever
// the finger/cursor currently is while scrubbing.
const scrubTooltipStyle = computed(() => {
  if (!discPos.value) return {}
  const nearTop = discPos.value.y / H < 0.3
  const leftPct = (discPos.value.x / W) * 100
  return {
    left: `${leftPct}%`,
    top: nearTop ? `${(discPos.value.y / H) * 100}%` : undefined,
    bottom: nearTop ? undefined : `${(1 - discPos.value.y / H) * 100}%`,
    transform: `translate(${leftPct > 70 ? '-100%' : leftPct < 15 ? '0%' : '-50%'}, ${nearTop ? '14px' : '-14px'})`,
  }
})

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
  flightProgress.value = progress
}

function playFlight() {
  const pts = points.value
  if (!pts.length || stopped) return

  if (prefersReducedMotion()) {
    // Skip the flight animation entirely, just settle the disc at the catch point.
    const end = pts[pts.length - 1]
    discPos.value = { x: end.x, y: end.y }
    discAngle.value = 0
    flightProgress.value = 1
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
    flightProgress.value = progress

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

// Tears down whatever is currently pending (flight frame or either hold
// timer), so a click/replay/scrub never leaves two loops racing.
function stopLoop() {
  if (rafId != null) cancelAnimationFrame(rafId)
  rafId = null
  clearTimeout(pauseTimer)
  animating.value = false
}

function replay() {
  stopLoop()
  playFlight()
}

// ── Tap/drag to inspect a point in the flight ───────────────────────────────
const svgEl = ref(null)
const scrubbing = ref(false)

function progressFromClientX(clientX) {
  if (!svgEl.value || !points.value.length) return 0
  const rect = svgEl.value.getBoundingClientRect()
  const fracX = rect.width ? (clientX - rect.left) / rect.width : 0
  const xViewBox = fracX * W
  return Math.min(1, Math.max(0, (xViewBox - PAD_X) / (W - PAD_X * 2)))
}

function onPointerDown(e) {
  if (!points.value.length) return
  scrubbing.value = true
  stopLoop()
  e.currentTarget.setPointerCapture?.(e.pointerId)
  settleAtProgress(progressFromClientX(e.clientX))
}

function onPointerMove(e) {
  if (!scrubbing.value) return
  settleAtProgress(progressFromClientX(e.clientX))
}

// Letting go (or the pointer leaving the chart) hands control back to the
// auto-replay loop, restarting it from release.
function endScrub() {
  if (!scrubbing.value) return
  scrubbing.value = false
  replay()
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
  <div v-if="series?.length" class="flight-chart">
    <div class="flight-chart__head">
      <span class="flight-chart__title">{{ t('discs.throwDetail.flightPath.title') }}</span>
    </div>

    <div class="flight-chart__plot">
      <svg
        ref="svgEl"
        class="flight-chart__svg"
        :viewBox="`0 0 ${W} ${H}`"
        preserveAspectRatio="none"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="endScrub"
        @pointercancel="endScrub"
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
          <clipPath id="sd-flight-reveal">
            <rect x="0" y="0" :width="revealWidth" :height="H" />
          </clipPath>
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

        <!-- Full arc, dim, always visible as a preview of the whole throw -->
        <path :d="pathD" class="flight-chart__path flight-chart__path--ghost" fill="none" />
        <!-- Same arc, revealed only up to the disc's current position -->
        <path
          :d="pathD"
          class="flight-chart__path flight-chart__path--active"
          stroke="url(#sd-flight-gradient)"
          fill="none"
          clip-path="url(#sd-flight-reveal)"
        />

        <line
          v-if="trackerPoint"
          class="flight-chart__tracker"
          :x1="trackerPoint.x" :x2="trackerPoint.x"
          :y1="trackerPoint.y" :y2="BASELINE_Y"
        />

        <g
          v-if="discPos"
          class="flight-chart__disc"
          :style="{ transform: `translate(${discPos.x}px, ${discPos.y}px)` }"
        >
          <g
            class="flight-chart__disc-inner"
            filter="url(#sd-disc-shadow)"
            :style="{ transform: `rotate(${discAngle}deg) scale(${discScale}) scaleY(${0.55 + 0.15 * discWobble})` }"
          >
            <ellipse cx="0" cy="0" :rx="DISC_RX + 1.5" :ry="DISC_RY + 1.2" class="flight-chart__disc-rim" />
            <ellipse :cy="DISC_RY * 0.5" :rx="DISC_RX * 0.95" :ry="DISC_RY * 0.75" class="flight-chart__disc-underside" />
            <ellipse cx="0" cy="0" :rx="DISC_RX" :ry="DISC_RY" class="flight-chart__disc-body" />
            <ellipse :cx="-DISC_RX * 0.3" :cy="-DISC_RY * 0.35" :rx="DISC_RX * 0.35" :ry="DISC_RY * 0.3" class="flight-chart__disc-highlight" />
          </g>
        </g>
      </svg>

      <div v-if="pastPeak && !scrubbing" class="flight-chart__peak-tag" :style="peakTagStyle">
        {{ peakLabelText }}
      </div>

      <div v-if="scrubbing && liveSample" class="flight-chart__scrub-tooltip" :style="scrubTooltipStyle">
        <strong>{{ heightLabel }} m · {{ spinLabel }} rpm</strong>
        <span>{{ scrubTimeLabel }}</span>
      </div>
    </div>

    <div class="flight-chart__stats">
      <SdStatTile dark :v="heightLabel" u="m" :k="t('discs.throwDetail.flightPath.height')" />
      <SdStatTile dark :v="spinLabel" u="rpm" :k="t('discs.throwDetail.flightPath.spin')" />
    </div>
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

.flight-chart__plot {
  position: relative;
}

.flight-chart__svg {
  width: 100%;
  height: 160px;
  display: block;
  overflow: visible;
  touch-action: pan-y;
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
.flight-chart__path--ghost {
  stroke: rgba(182, 198, 221, .25);
}

.flight-chart__tracker {
  stroke: rgba(238, 243, 250, .35);
  stroke-width: 1;
  stroke-dasharray: 2 3;
  vector-effect: non-scaling-stroke;
}

.flight-chart__peak-tag {
  position: absolute;
  font-family: var(--sd-font-display);
  font-size: 11px;
  font-weight: 600;
  color: var(--sd-gold-300);
  white-space: nowrap;
  pointer-events: none;
}

.flight-chart__scrub-tooltip {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 5px 8px;
  border-radius: var(--sd-r-xs);
  background: rgba(10, 28, 61, .92);
  border: 1px solid rgba(255, 255, 255, .14);
  pointer-events: none;
  white-space: nowrap;
}

.flight-chart__scrub-tooltip strong {
  font-family: var(--sd-font-display);
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-fg-on-dark);
}

.flight-chart__scrub-tooltip span {
  font-family: var(--sd-font-body);
  font-size: 10px;
  color: var(--sd-fg2-on-dark);
}

.flight-chart__disc-inner {
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

.flight-chart__stats {
  display: flex;
  gap: 8px;
  margin-top: 14px;
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
