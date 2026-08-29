<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  series: { type: Array, required: true },
  metric: { type: String, required: true }, // 'rpm' | 'alt'
  title: { type: String, required: true },
})

const METRIC = {
  rpm: {
    color: 'var(--sd-gold-300)',
    valueKey: 'rpm',
    formatValue: v => `${Math.round(v)}`,
    unit: 'RPM',
  },
  alt: {
    color: 'var(--sd-ink-300)',
    valueKey: 'altM',
    formatValue: v => `${v.toFixed(2)}`,
    unit: 'm',
  },
}

const cfg = computed(() => METRIC[props.metric])

const W = 300
const H = 100
const PAD_X = 4
const PAD_Y = 10

const points = computed(() => {
  const pts = props.series
  if (!pts?.length) return []
  const key = cfg.value.valueKey
  const tMax = pts[pts.length - 1].tMs || 1
  const values = pts.map(p => p[key])
  let vMin = Math.min(...values)
  let vMax = Math.max(...values)
  if (vMin === vMax) {
    vMin -= 1
    vMax += 1
  }
  return pts.map(p => ({
    tMs: p.tMs,
    value: p[key],
    x: PAD_X + (p.tMs / tMax) * (W - PAD_X * 2),
    y: PAD_Y + (1 - (p[key] - vMin) / (vMax - vMin)) * (H - PAD_Y * 2),
  }))
})

const linePath = computed(() =>
  points.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
)

const peakPoint = computed(() => {
  if (!points.value.length) return null
  return points.value.reduce((a, b) => (b.value > a.value ? b : a))
})

const peakLabelText = computed(() => {
  if (!peakPoint.value) return ''
  const seconds = (peakPoint.value.tMs / 1000).toFixed(1)
  return `${cfg.value.formatValue(peakPoint.value.value)} ${cfg.value.unit} · ${seconds}s`
})

const peakTagStyle = computed(() => {
  if (!peakPoint.value) return {}
  const nearTop = peakPoint.value.y / H < 0.3
  return {
    left: `${(peakPoint.value.x / W) * 100}%`,
    top: nearTop ? `${(peakPoint.value.y / H) * 100}%` : undefined,
    bottom: nearTop ? undefined : `${(1 - peakPoint.value.y / H) * 100}%`,
    transform: `translate(-50%, ${nearTop ? '10px' : '-10px'})`,
  }
})

const maxTimeLabel = computed(() => {
  const last = props.series?.[props.series.length - 1]
  return last ? `${(last.tMs / 1000).toFixed(1)}s` : ''
})

const svgEl = ref(null)
const hoverIndex = ref(null)

function nearestIndex(clientX) {
  const rect = svgEl.value.getBoundingClientRect()
  const fracX = (clientX - rect.left) / rect.width
  const targetX = PAD_X + fracX * (W - PAD_X * 2)
  let closest = 0
  let closestDist = Infinity
  points.value.forEach((p, i) => {
    const dist = Math.abs(p.x - targetX)
    if (dist < closestDist) {
      closestDist = dist
      closest = i
    }
  })
  return closest
}

function onPointerMove(e) {
  if (!points.value.length) return
  hoverIndex.value = nearestIndex(e.clientX)
}

function onPointerLeave() {
  hoverIndex.value = null
}

const hoverPoint = computed(() =>
  hoverIndex.value != null ? points.value[hoverIndex.value] : null
)

const hoverTooltipStyle = computed(() => {
  if (!hoverPoint.value) return {}
  const leftPct = (hoverPoint.value.x / W) * 100
  return {
    left: `${leftPct}%`,
    transform: leftPct > 70 ? 'translateX(-100%)' : 'translateX(0)',
  }
})
</script>

<template>
  <div class="throw-chart">
    <div class="throw-chart__head">
      <span class="throw-chart__title">{{ title }}</span>
      <span v-if="peakPoint" class="throw-chart__peak-summary">{{ peakLabelText }}</span>
    </div>

    <div class="throw-chart__plot">
      <svg
        ref="svgEl"
        class="throw-chart__svg"
        :viewBox="`0 0 ${W} ${H}`"
        preserveAspectRatio="none"
        @pointermove="onPointerMove"
        @pointerdown="onPointerMove"
        @pointerleave="onPointerLeave"
      >
        <line
          v-for="frac in [0, 0.5, 1]"
          :key="frac"
          class="throw-chart__grid"
          :x1="0" :x2="W"
          :y1="PAD_Y + frac * (H - PAD_Y * 2)"
          :y2="PAD_Y + frac * (H - PAD_Y * 2)"
        />

        <path :d="linePath" class="throw-chart__line" :style="{ stroke: cfg.color }" fill="none" />

        <line
          v-if="hoverPoint"
          class="throw-chart__crosshair"
          :x1="hoverPoint.x" :x2="hoverPoint.x"
          :y1="0" :y2="H"
        />

        <circle
          v-if="peakPoint"
          class="throw-chart__peak-dot"
          :cx="peakPoint.x" :cy="peakPoint.y" r="4"
          :fill="cfg.color"
        />

        <circle
          v-if="hoverPoint"
          class="throw-chart__hover-dot"
          :cx="hoverPoint.x" :cy="hoverPoint.y" r="4"
          :fill="cfg.color"
        />

        <circle
          v-if="hoverPoint"
          class="throw-chart__hit-area"
          :cx="hoverPoint.x" :cy="hoverPoint.y" r="12"
        />
      </svg>

      <div v-if="peakPoint" class="throw-chart__peak-tag" :style="peakTagStyle">
        {{ peakLabelText }}
      </div>

      <div v-if="hoverPoint" class="throw-chart__tooltip" :style="hoverTooltipStyle">
        <strong>{{ cfg.formatValue(hoverPoint.value) }} {{ cfg.unit }}</strong>
        <span>{{ (hoverPoint.tMs / 1000).toFixed(2) }}s</span>
      </div>
    </div>

    <div class="throw-chart__axis">
      <span>0.0s</span>
      <span>{{ maxTimeLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.throw-chart {
  padding: 14px 16px 10px;
  border-radius: var(--sd-r-md);
  background: rgba(255, 255, 255, .06);
  border: 1px solid rgba(255, 255, 255, .10);
}

.throw-chart__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.throw-chart__title {
  font-family: var(--sd-font-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--sd-fg2-on-dark);
}

.throw-chart__peak-summary {
  font-family: var(--sd-font-display);
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-fg-on-dark);
  white-space: nowrap;
}

.throw-chart__plot {
  position: relative;
  height: 92px;
  margin-top: 22px;
}

.throw-chart__svg {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: pan-y;
}

.throw-chart__grid {
  stroke: rgba(182, 198, 221, .12);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.throw-chart__line {
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.throw-chart__crosshair {
  stroke: rgba(238, 243, 250, .35);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.throw-chart__peak-dot,
.throw-chart__hover-dot {
  stroke: var(--sd-ink-900);
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.throw-chart__hit-area {
  fill: transparent;
  pointer-events: none;
}

.throw-chart__peak-tag {
  position: absolute;
  font-family: var(--sd-font-display);
  font-size: 11px;
  font-weight: 600;
  color: var(--sd-fg-on-dark);
  white-space: nowrap;
  pointer-events: none;
}

.throw-chart__tooltip {
  position: absolute;
  bottom: 0;
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

.throw-chart__tooltip strong {
  font-family: var(--sd-font-display);
  font-size: 12px;
  font-weight: 600;
  color: var(--sd-fg-on-dark);
}

.throw-chart__tooltip span {
  font-family: var(--sd-font-body);
  font-size: 10px;
  color: var(--sd-fg2-on-dark);
}

.throw-chart__axis {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-family: var(--sd-font-body);
  font-size: 10px;
  color: var(--sd-fg2-on-dark);
  opacity: .7;
}
</style>
