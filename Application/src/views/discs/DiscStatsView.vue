<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SdChip, SdCard } from '@/components/ui'
import SdStatTile from '@/components/ui/SdStatTile.vue'
import SdThrowRow from '@/components/discs/SdThrowRow.vue'
import { TrendingUp, ChevronRight } from 'lucide-vue-next'
import { usePreferences } from '@/composables/usePreferences'
import { useThrows, formatThrowTime } from '@/composables/useThrows'
import { useI18n } from '@/i18n'
import { convertDistance, distanceUnitLabel } from '@/utils/units'

const route = useRoute()
const router = useRouter()
const { getThrows, fetchThrows, toggleThrowFavorite } = useThrows()
const { distanceUnit } = usePreferences()
const { t, language } = useI18n()

const throws = computed(() => getThrows(route.params.id))

const MS_DAY = 86400000

// `days: null` means "everything on record", spanning from the first throw.
const RANGES = [
  { key: 'week',  label: 'discs.stats.rangeWeek',  period: 'discs.stats.prevWeek',  days: 7 },
  { key: 'month', label: 'discs.stats.rangeMonth', period: 'discs.stats.prevMonth', days: 30 },
  { key: 'all',   label: 'discs.stats.rangeAll',   period: 'discs.stats.prevAll',   days: null },
]
const METRICS = [
  { key: 'rpm', label: 'discs.stats.metricSpin' },
  { key: 'alt', label: 'discs.stats.metricHeight' },
]

const range = ref('week')
const metric = ref('rpm')
const selectedBar = ref(null)
const expandedTile = ref(null)

function avgOf(arr) {
  return arr.length ? arr.reduce((sum, v) => sum + v, 0) / arr.length : null
}
function maxOf(arr) {
  return arr.length ? Math.max(...arr) : null
}
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
function computeTrend(thisVals, lastVals) {
  if (!thisVals.length || !lastVals.length) return null
  const thisAvg = avgOf(thisVals)
  const lastAvg = avgOf(lastVals)
  if (!lastAvg) return null
  const percent = Math.round(((thisAvg - lastAvg) / lastAvg) * 100) || 0
  const direction = Math.abs(percent) <= 1 ? 'same' : (percent > 0 ? 'up' : 'down')
  return { percent, direction }
}

function valueOf(th, key) {
  return key === 'rpm' ? th.rpm : th.maxAltM
}
function valuesOf(list, key) {
  return list.map(th => valueOf(th, key)).filter(v => v != null)
}
function bestThrowOf(list, key) {
  const candidates = list.filter(th => valueOf(th, key) != null)
  if (!candidates.length) return null
  return candidates.reduce((best, th) => (valueOf(th, key) > valueOf(best, key) ? th : best))
}
function formatMetric(v, key) {
  if (v == null) return '—'
  return key === 'rpm' ? Math.round(v) : convertDistance(v, distanceUnit.value)
}
function metricUnitLabel(key) {
  return key === 'rpm' ? 'rpm' : distanceUnitLabel(distanceUnit.value)
}

const rangeCfg = computed(() => RANGES.find(r => r.key === range.value))

const earliestMs = computed(() => {
  const times = throws.value.map(th => new Date(th.recordedAt).getTime())
  return times.length ? Math.min(...times) : Date.now()
})

const rangeDays = computed(() => {
  if (rangeCfg.value.days) return rangeCfg.value.days
  const span = startOfDay(new Date()).getTime() + MS_DAY - startOfDay(new Date(earliestMs.value)).getTime()
  return Math.max(1, Math.round(span / MS_DAY))
})

// Every stat on the screen is derived from this window.
const windowThrows = computed(() => {
  const now = Date.now()
  const days = rangeCfg.value.days
  return throws.value.filter(th => {
    const diff = now - new Date(th.recordedAt).getTime()
    return diff >= 0 && (days == null || diff < days * MS_DAY)
  })
})

// Week/month compare against the preceding equal-length span; all-time has no
// such span, so it compares the newer half of the record against the older.
const trendSplitMs = computed(() => earliestMs.value + (Date.now() - earliestMs.value) / 2)

const trendCurrent = computed(() => {
  if (rangeCfg.value.days) return windowThrows.value
  return windowThrows.value.filter(th => new Date(th.recordedAt).getTime() >= trendSplitMs.value)
})
const trendPrevious = computed(() => {
  const now = Date.now()
  const days = rangeCfg.value.days
  if (!days) return windowThrows.value.filter(th => new Date(th.recordedAt).getTime() < trendSplitMs.value)
  return throws.value.filter(th => {
    const diff = now - new Date(th.recordedAt).getTime()
    return diff >= days * MS_DAY && diff < days * 2 * MS_DAY
  })
})

const rpmTrend = computed(() => computeTrend(valuesOf(trendCurrent.value, 'rpm'), valuesOf(trendPrevious.value, 'rpm')))
const altTrend = computed(() => computeTrend(valuesOf(trendCurrent.value, 'alt'), valuesOf(trendPrevious.value, 'alt')))
const metricTrend = computed(() => (metric.value === 'rpm' ? rpmTrend.value : altTrend.value))

function trendText(trend) {
  if (!trend || trend.direction === 'same') return t('discs.stats.trendSame')
  return t(trend.direction === 'up' ? 'discs.stats.trendUp' : 'discs.stats.trendDown', {
    percent: Math.abs(trend.percent),
    period: t(rangeCfg.value.period),
  })
}

// Chart — at most 7 buckets tiling the range and ending today, so a week plots
// one bar per day while longer ranges group days together.
const buckets = computed(() => {
  const bucketDays = Math.max(1, Math.ceil(rangeDays.value / 7))
  const count = Math.ceil(rangeDays.value / bucketDays)
  const end = startOfDay(new Date()).getTime() + MS_DAY
  const out = []
  for (let i = count - 1; i >= 0; i--) {
    const to = end - i * bucketDays * MS_DAY
    const from = to - bucketDays * MS_DAY
    out.push({
      from,
      to,
      days: bucketDays,
      throws: throws.value.filter(th => {
        const at = new Date(th.recordedAt).getTime()
        return at >= from && at < to
      }),
    })
  }
  return out
})

const bucketValues = computed(() => buckets.value.map(b => maxOf(valuesOf(b.throws, metric.value)) ?? 0))
const bucketMax = computed(() => Math.max(...bucketValues.value, 1))
const bars = computed(() => bucketValues.value.map(v => (v / bucketMax.value) * 100))

const dayNames = computed(() => t('discs.stats.weekdays'))
const dateFormat = computed(() => new Intl.DateTimeFormat(language.value, { day: 'numeric', month: 'numeric' }))

const barLabels = computed(() =>
  buckets.value.map(b => {
    const start = new Date(b.from)
    return b.days === 1 ? dayNames.value[(start.getDay() + 6) % 7] : dateFormat.value.format(start)
  })
)

const selectedBucket = computed(() => (selectedBar.value != null ? buckets.value[selectedBar.value] ?? null : null))
// All throws in the clicked bucket, best-for-the-active-metric first (throws
// missing that metric sort to the end, most recent first among those).
const selectedThrows = computed(() => {
  if (!selectedBucket.value) return []
  return [...selectedBucket.value.throws].sort((a, b) => {
    const av = valueOf(a, metric.value)
    const bv = valueOf(b, metric.value)
    if (av == null && bv == null) return new Date(b.recordedAt) - new Date(a.recordedAt)
    if (av == null) return 1
    if (bv == null) return -1
    return bv - av
  })
})

const selectedLabel = computed(() => {
  const b = selectedBucket.value
  if (!b) return ''
  const start = new Date(b.from)
  if (b.days === 1) return `${dayNames.value[(start.getDay() + 6) % 7]} · ${dateFormat.value.format(start)}`
  return `${dateFormat.value.format(start)} – ${dateFormat.value.format(new Date(b.to - MS_DAY))}`
})

const metricTopLabel = computed(() => t(metric.value === 'rpm' ? 'discs.stats.topSpin' : 'discs.stats.maxHeight'))
const chartLabel = computed(() => (selectedBucket.value ? selectedLabel.value : metricTopLabel.value))
const chartValue = computed(() =>
  selectedBucket.value
    ? formatMetric(bucketValues.value[selectedBar.value] || null, metric.value)
    : formatMetric(maxOf(valuesOf(windowThrows.value, metric.value)), metric.value)
)

// Tiles
const throwCount = computed(() => windowThrows.value.length)
const bestRpm = computed(() => maxOf(valuesOf(windowThrows.value, 'rpm')))
const bestAlt = computed(() => maxOf(valuesOf(windowThrows.value, 'alt')))

const detailThrow = computed(() =>
  expandedTile.value === 'rpm' || expandedTile.value === 'alt'
    ? bestThrowOf(windowThrows.value, expandedTile.value)
    : null
)
const detailValue = computed(() =>
  detailThrow.value
    ? `${formatMetric(valueOf(detailThrow.value, expandedTile.value), expandedTile.value)} ${metricUnitLabel(expandedTile.value)}`
    : ''
)

// Gauges — the range average measured against the range best.
const avgRpm = computed(() => avgOf(valuesOf(windowThrows.value, 'rpm')))
const avgAlt = computed(() => avgOf(valuesOf(windowThrows.value, 'alt')))
const avgRpmGaugePct = computed(() =>
  avgRpm.value == null || !bestRpm.value ? 0 : clamp((avgRpm.value / bestRpm.value) * 100, 0, 100)
)
const avgAltGaugePct = computed(() =>
  avgAlt.value == null || !bestAlt.value ? 0 : clamp((avgAlt.value / bestAlt.value) * 100, 0, 100)
)

function setRange(key) {
  range.value = key
  selectedBar.value = null
  expandedTile.value = null
}
function setMetric(key) {
  metric.value = key
  selectedBar.value = null
}
function selectBar(i) {
  selectedBar.value = selectedBar.value === i ? null : i
}
function toggleTile(key) {
  expandedTile.value = expandedTile.value === key ? null : key
}
function openThrow(id) {
  router.push(`/discs/${route.params.id}/throw/${id}`)
}
function onToggleFav(thr) {
  toggleThrowFavorite(route.params.id, thr.id, !thr.fav).catch(() => {
    // best-effort — star just won't flip if this fails
  })
}

// Entrance animation — bars/gauges grow from 0 to their real value on mount.
const animated = ref(false)

onMounted(() => {
  fetchThrows(route.params.id).catch(() => {
    // throwsError already holds a friendly message if the caller needs it
  })
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animated.value = true
    })
  })
})
</script>

<template>
  <div class="stats-wrap">
    <!-- Time range -->
    <div class="chip-row">
      <button
        v-for="r in RANGES"
        :key="r.key"
        type="button"
        class="chip-btn"
        :aria-pressed="range === r.key"
        @click="setRange(r.key)"
      >
        <SdChip :tone="range === r.key ? 'owner' : 'solid-light'">{{ t(r.label) }}</SdChip>
      </button>
    </div>

    <!-- Metric chart -->
    <SdCard :padding="18" class="chart-card">
      <div class="glass-card__header">
        <div class="stat-group">
          <div class="stat-label">{{ chartLabel }}</div>
          <div class="stat-big">{{ chartValue }}<span class="stat-unit">{{ metricUnitLabel(metric) }}</span></div>
        </div>
        <SdChip v-if="metricTrend" tone="gold">
          <template #icon><TrendingUp :size="12" /></template>
          {{ metricTrend.percent > 0 ? '+' : '' }}{{ metricTrend.percent }}%
        </SdChip>
      </div>

      <div class="chip-row chip-row--metrics">
        <button
          v-for="m in METRICS"
          :key="m.key"
          type="button"
          class="chip-btn"
          :aria-pressed="metric === m.key"
          @click="setMetric(m.key)"
        >
          <SdChip :tone="metric === m.key ? 'owner' : 'solid-light'">{{ t(m.label) }}</SdChip>
        </button>
      </div>

      <div class="chart">
        <button
          v-for="(h, i) in bars"
          :key="i"
          type="button"
          class="chart__bar"
          :class="{ 'chart__bar--gold': selectedBar == null ? i === bars.length - 1 : i === selectedBar }"
          :aria-label="barLabels[i]"
          :aria-pressed="selectedBar === i"
          @click="selectBar(i)"
        >
          <span
            class="chart__fill"
            :style="{ height: (animated ? h : 0) + '%', transitionDelay: (i * 40) + 'ms' }"
          />
        </button>
      </div>
      <div class="chart__labels">
        <span v-for="(d, i) in barLabels" :key="i">{{ d }}</span>
      </div>

      <div v-if="selectedThrows.length" class="bucket-throws">
        <SdThrowRow
          v-for="thr in selectedThrows"
          :key="thr.id"
          :name="thr.name"
          :time="formatThrowTime(t, thr)"
          :rpm="thr.rpm"
          :fav="thr.fav"
          :auto="thr.auto"
          @click="openThrow(thr.id)"
          @toggle-fav="onToggleFav(thr)"
        />
      </div>
      <div v-else-if="selectedBucket" class="readout readout--empty">{{ t('discs.stats.noData') }}</div>
    </SdCard>

    <!-- Drill-down tiles -->
    <div class="tile-row">
      <SdStatTile
        interactive
        :active="expandedTile === 'count'"
        :v="throwCount"
        :k="t('discs.stats.throwCount')"
        @click="toggleTile('count')"
      />
      <SdStatTile
        interactive
        :active="expandedTile === 'rpm'"
        :v="formatMetric(bestRpm, 'rpm')"
        u="rpm"
        :k="t('discs.stats.topSpin')"
        @click="toggleTile('rpm')"
      />
      <SdStatTile
        interactive
        :active="expandedTile === 'alt'"
        :v="formatMetric(bestAlt, 'alt')"
        :u="metricUnitLabel('alt')"
        :k="t('discs.stats.maxHeight')"
        @click="toggleTile('alt')"
      />
    </div>

    <SdCard v-if="expandedTile" :padding="16" class="detail-card">
      <template v-if="expandedTile === 'count'">
        <div class="stat-label">{{ t('discs.stats.throwCount') }}</div>
        <button type="button" class="readout" @click="router.push(`/discs/${route.params.id}/throws`)">
          <div class="throw-name">{{ t('discs.stats.viewThrows') }}</div>
          <ChevronRight :size="16" :stroke-width="1.75" />
        </button>
      </template>
      <template v-else>
        <div class="stat-label">{{ t('discs.stats.bestThrow') }}</div>
        <button v-if="detailThrow" type="button" class="readout" @click="openThrow(detailThrow.id)">
          <div>
            <div class="throw-name">{{ detailThrow.name }}</div>
            <div class="throw-time">{{ formatThrowTime(t, detailThrow) }} · {{ detailValue }}</div>
          </div>
          <ChevronRight :size="16" :stroke-width="1.75" />
        </button>
        <div v-else class="readout readout--empty">{{ t('discs.stats.noData') }}</div>
      </template>
    </SdCard>

    <!-- Averages -->
    <div class="gauge-row">
      <SdCard flex :padding="16">
        <div class="stat-label">{{ t('discs.stats.avgSpin') }}</div>
        <div class="stat-big">{{ formatMetric(avgRpm, 'rpm') }}<span class="stat-unit">rpm</span></div>
        <div class="gauge"><div class="gauge__fill" :style="{ width: (animated ? avgRpmGaugePct : 0) + '%' }" /></div>
      </SdCard>
      <SdCard flex :padding="16">
        <div class="stat-label">{{ t('discs.stats.avgHeight') }}</div>
        <div class="stat-big">{{ formatMetric(avgAlt, 'alt') }}<span class="stat-unit">{{ metricUnitLabel('alt') }}</span></div>
        <div class="gauge"><div class="gauge__fill" :style="{ width: (animated ? avgAltGaugePct : 0) + '%' }" /></div>
      </SdCard>
    </div>

    <div class="nav-spacer" />
  </div>
</template>

<style scoped>
.stats-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nav-spacer {
  height: var(--sd-nav-clearance);
  flex: none;
}

/* ≥768px: the wider column keeps every row full width — each row already lays
   its own tiles out side by side — and the chart gets taller bars. */
@media (min-width: 768px) {
  .stats-wrap {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    align-items: stretch;
  }
  .chart { height: 96px; }
}

.glass-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.chip-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip-row--metrics { margin-bottom: 4px; }

.chip-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  outline: none;
  border-radius: var(--sd-r-pill);
  -webkit-tap-highlight-color: transparent;
}
.chip-btn:active { transform: scale(0.94); }

.tile-row {
  display: flex;
  gap: 10px;
}

.gauge-row {
  display: flex;
  gap: 10px;
}

.stat-label {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.stat-big {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 26px;
  color: var(--sd-ink);
  line-height: 1;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.stat-unit { font-size: 13px; color: var(--sd-fg3); font-weight: 500; }

.stat-group { display: flex; flex-direction: column; gap: 4px; }

.chart {
  display: flex;
  align-items: stretch;
  gap: 5px;
  height: 60px;
  margin-top: 10px;
}
.chart__bar {
  flex: 1;
  display: flex;
  align-items: flex-end;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.chart__fill {
  width: 100%;
  border-radius: 4px 4px 1px 1px;
  background: linear-gradient(180deg, var(--sd-azure), var(--sd-ink-700));
  min-height: 4px;
  transition: height 700ms var(--sd-ease-out);
}
.chart__bar--gold .chart__fill { background: var(--sd-gold-grad); }

.chart__labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-family: var(--sd-font-display);
  font-size: 10px;
  color: var(--sd-fg3);
  letter-spacing: 0.08em;
}
.chart__labels span { flex: 1; text-align: center; }

.bucket-throws {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.readout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: var(--sd-r-md);
  background: rgba(255, 255, 255, .5);
  border: 1px solid rgba(255, 255, 255, .55);
  color: var(--sd-fg3);
  font: inherit;
  text-align: left;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--sd-dur-fast) var(--sd-ease-out),
              transform var(--sd-dur-fast) var(--sd-ease-out);
}
.readout:active { background: rgba(255, 255, 255, .75); transform: scale(1.02); }

.readout--empty {
  justify-content: center;
  cursor: default;
  font-family: var(--sd-font-display);
  font-size: 11px;
  letter-spacing: 0.04em;
}
.readout--empty:active { background: rgba(255, 255, 255, .5); transform: none; }

.gauge {
  width: 100%;
  height: 6px;
  border-radius: 99px;
  background: rgba(16, 42, 87, .10);
  overflow: hidden;
  margin-top: 8px;
}
.gauge__fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--sd-azure), var(--sd-gold-300));
  transition: width 700ms var(--sd-ease-out);
}

.trend {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  margin-top: 6px;
}
.trend--up { color: var(--sd-success); }

.throw-name {
  font-family: var(--sd-font-body);
  font-weight: 600;
  font-size: 14px;
  color: var(--sd-fg1);
  line-height: 1.15;
}
.throw-time {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  margin-top: 3px;
  letter-spacing: 0.02em;
}
</style>
