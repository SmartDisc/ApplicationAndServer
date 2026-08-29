<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SdChip, SdCard } from '@/components/ui'
import SdStatTile from '@/components/ui/SdStatTile.vue'
import { TrendingUp, Star } from 'lucide-vue-next'
import { useDiscs } from '@/composables/useDiscs'
import { usePreferences } from '@/composables/usePreferences'
import { useThrows, formatThrowTime } from '@/composables/useThrows'
import { useI18n } from '@/i18n'
import { convertDistance, distanceUnitLabel, formatDistance } from '@/utils/units'

const route = useRoute()
const router = useRouter()
const { getDisc } = useDiscs()
const { getThrows, fetchThrows } = useThrows()
const { distanceUnit } = usePreferences()
const { t } = useI18n()
const disc = computed(() => getDisc(route.params.id))

const throws = computed(() => getThrows(route.params.id))

const MS_DAY = 86400000

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

const rpmAll = computed(() => throws.value.map(th => th.rpm).filter(v => v != null))
const altAll = computed(() => throws.value.map(th => th.maxAltM).filter(v => v != null))

const allTimeBestRpm  = computed(() => maxOf(rpmAll.value))
const allTimeAvgRpm   = computed(() => avgOf(rpmAll.value))
const allTimeBestAltM = computed(() => maxOf(altAll.value))

const thisWeekThrows = computed(() =>
  throws.value.filter(th => {
    const diff = Date.now() - new Date(th.recordedAt).getTime()
    return diff >= 0 && diff < 7 * MS_DAY
  })
)
const lastWeekThrows = computed(() =>
  throws.value.filter(th => {
    const diff = Date.now() - new Date(th.recordedAt).getTime()
    return diff >= 7 * MS_DAY && diff < 14 * MS_DAY
  })
)

const thisWeekRpm = computed(() => thisWeekThrows.value.map(th => th.rpm).filter(v => v != null))
const lastWeekRpm = computed(() => lastWeekThrows.value.map(th => th.rpm).filter(v => v != null))
const thisWeekAlt = computed(() => thisWeekThrows.value.map(th => th.maxAltM).filter(v => v != null))
const lastWeekAlt = computed(() => lastWeekThrows.value.map(th => th.maxAltM).filter(v => v != null))

const thisWeekAvgRpm = computed(() => avgOf(thisWeekRpm.value))
const thisWeekMaxAlt = computed(() => maxOf(thisWeekAlt.value))
const lastWeekMaxAlt = computed(() => maxOf(lastWeekAlt.value))

const rpmTrend = computed(() => computeTrend(thisWeekRpm.value, lastWeekRpm.value))
const altTrend = computed(() =>
  computeTrend(
    thisWeekMaxAlt.value != null ? [thisWeekMaxAlt.value] : [],
    lastWeekMaxAlt.value != null ? [lastWeekMaxAlt.value] : []
  )
)

// Top spin card
const topSpin = computed(() => allTimeBestRpm.value ?? 0)

// Weekly chart — max recorded height per day, oldest (6 days ago) -> today.
const weekDays = computed(() => {
  const today = startOfDay(new Date())
  const out = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    out.push(d)
  }
  return out
})
const weekDayRawValues = computed(() =>
  weekDays.value.map(day => {
    const alts = throws.value
      .filter(th => th.maxAltM != null && startOfDay(new Date(th.recordedAt)).getTime() === day.getTime())
      .map(th => th.maxAltM)
    return maxOf(alts) ?? 0
  })
)
const weekDayMax = computed(() => Math.max(...weekDayRawValues.value, 1))
const bars = computed(() => weekDayRawValues.value.map(v => (v / weekDayMax.value) * 100))
const days = computed(() => t('discs.stats.weekdays'))
const barLabels = computed(() => weekDays.value.map(d => days.value[(d.getDay() + 6) % 7]))

// Avg spin tile
const avgSpin = computed(() => (allTimeAvgRpm.value != null ? Math.round(allTimeAvgRpm.value) : 0))
const avgSpinGaugePct = computed(() => {
  if (thisWeekAvgRpm.value == null || !allTimeBestRpm.value) return 0
  return clamp((thisWeekAvgRpm.value / allTimeBestRpm.value) * 100, 0, 100)
})

// Max height tile
const maxHeight     = computed(() => convertDistance(allTimeBestAltM.value ?? 0, distanceUnit.value))
const maxHeightUnit = computed(() => distanceUnitLabel(distanceUnit.value))
const maxHeightGaugePct = computed(() => {
  if (thisWeekMaxAlt.value == null || !allTimeBestAltM.value) return 0
  return clamp((thisWeekMaxAlt.value / allTimeBestAltM.value) * 100, 0, 100)
})

// Best throw card — the single highest recorded altitude.
const bestThrowRow = computed(() => {
  const candidates = throws.value.filter(th => th.maxAltM != null)
  if (!candidates.length) return null
  return candidates.reduce((best, th) => (th.maxAltM > best.maxAltM ? th : best))
})
const bestThrowHeight = computed(() =>
  bestThrowRow.value ? formatDistance(bestThrowRow.value.maxAltM, distanceUnit.value) : ''
)

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
    <!-- Spin chart -->
    <SdCard :padding="18">
      <div class="glass-card__header">
        <div class="stat-group">
          <div class="stat-label">{{ t('discs.stats.topSpin') }}</div>
          <div class="stat-big">{{ topSpin }}<span class="stat-unit">rpm</span></div>
        </div>
        <SdChip v-if="rpmTrend" tone="gold">
          <template #icon><TrendingUp :size="12" /></template>
          {{ rpmTrend.percent > 0 ? '+' : '' }}{{ rpmTrend.percent }}%
        </SdChip>
      </div>
      <div class="chart">
        <div
          v-for="(h, i) in bars"
          :key="i"
          class="chart__bar"
          :class="{ 'chart__bar--gold': i === bars.length - 1 }"
          :style="{ height: (animated ? h : 0) + '%', transitionDelay: (i * 40) + 'ms' }"
        />
      </div>
      <div class="chart__labels">
        <span v-for="(d, i) in barLabels" :key="i">{{ d }}</span>
      </div>
    </SdCard>

    <!-- RPM + Height tiles -->
    <div class="tile-row">
      <SdCard flex :padding="16">
        <div class="stat-label">{{ t('discs.stats.avgSpin') }}</div>
        <div class="stat-big">{{ avgSpin }}<span class="stat-unit">rpm</span></div>
        <div class="gauge"><div class="gauge__fill" :style="{ width: (animated ? avgSpinGaugePct : 0) + '%' }" /></div>
        <div class="trend" :class="{ 'trend--up': rpmTrend?.direction === 'up' }">
          {{
            rpmTrend && rpmTrend.direction !== 'same'
              ? t(rpmTrend.direction === 'up' ? 'discs.stats.trendUp' : 'discs.stats.trendDown', { percent: Math.abs(rpmTrend.percent) })
              : t('discs.stats.trendSame')
          }}
        </div>
      </SdCard>
      <SdCard flex :padding="16">
        <div class="stat-label">{{ t('discs.stats.maxHeight') }}</div>
        <div class="stat-big">{{ maxHeight }}<span class="stat-unit">{{ maxHeightUnit }}</span></div>
        <div class="gauge"><div class="gauge__fill" :style="{ width: (animated ? maxHeightGaugePct : 0) + '%' }" /></div>
        <div class="trend" :class="{ 'trend--up': altTrend?.direction === 'up' }">
          {{
            altTrend && altTrend.direction !== 'same'
              ? t(altTrend.direction === 'up' ? 'discs.stats.trendUp' : 'discs.stats.trendDown', { percent: Math.abs(altTrend.percent) })
              : t('discs.stats.trendSame')
          }}
        </div>
      </SdCard>
    </div>

    <!-- Best throw -->
    <SdCard
      v-if="bestThrowRow"
      :padding="18"
      class="best-throw-card"
      @click="router.push(`/discs/${route.params.id}/throw/${bestThrowRow.id}`)"
    >
      <div class="glass-card__header">
        <div class="stat-label">{{ t('discs.stats.bestThrow') }}</div>
        <SdChip tone="gold">
          <template #icon><Star :size="12" /></template>
          {{ bestThrowHeight }}
        </SdChip>
      </div>
      <div class="best-throw">
        <div>
          <div class="throw-name">{{ bestThrowRow.name }}</div>
          <div class="throw-time">
            {{ formatThrowTime(t, bestThrowRow) }}<template v-if="bestThrowRow.rpm != null"> · {{ bestThrowRow.rpm }} rpm</template>
          </div>
        </div>
      </div>
    </SdCard>

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

/* ≥768px: 2-column dashboard — speed chart spans the full width, the
   RPM/height tiles and best-throw card share the second row. */
@media (min-width: 768px) {
  .stats-wrap {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    align-items: stretch;
  }
  .stats-wrap > :first-child,
  .nav-spacer {
    grid-column: 1 / -1;
  }
  /* Taller bars so the full-width chart doesn't letterbox */
  .chart { height: 96px; }
}

.glass-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.tile-row {
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
  align-items: flex-end;
  gap: 5px;
  height: 60px;
  margin-top: 10px;
}
.chart__bar {
  flex: 1;
  border-radius: 4px 4px 1px 1px;
  background: linear-gradient(180deg, var(--sd-azure), var(--sd-ink-700));
  min-height: 4px;
  transition: height 700ms var(--sd-ease-out);
}
.chart__bar--gold { background: var(--sd-gold-grad); }

.chart__labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-family: var(--sd-font-display);
  font-size: 10px;
  color: var(--sd-fg3);
  letter-spacing: 0.08em;
}

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

.best-throw-card { cursor: pointer; }

.best-throw {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
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
