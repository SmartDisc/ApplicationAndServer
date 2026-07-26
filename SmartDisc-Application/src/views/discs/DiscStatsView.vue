<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SdChip, SdCard } from '@/components/ui'
import SdStatTile from '@/components/ui/SdStatTile.vue'
import { TrendingUp, Star } from 'lucide-vue-next'
import { useDiscs } from '@/composables/useDiscs'
import { usePreferences } from '@/composables/usePreferences'
import { useI18n } from '@/i18n'
import { convertSpeed, speedUnitLabel, convertDistance, distanceUnitLabel, formatDistance } from '@/utils/units'

const route = useRoute()
const { getDisc } = useDiscs()
const { speedUnit, distanceUnit } = usePreferences()
const { t } = useI18n()
const disc = computed(() => getDisc(route.params.id))

// Mock chart/summary data — base values are km/h and meters.
const topSpeedKmh   = 28
const maxHeightM    = 5.4
const bestThrowM    = 41
const topSpeed      = computed(() => convertSpeed(topSpeedKmh, speedUnit.value))
const topSpeedUnit  = computed(() => speedUnitLabel(speedUnit.value))
const maxHeight     = computed(() => convertDistance(maxHeightM, distanceUnit.value))
const maxHeightUnit = computed(() => distanceUnitLabel(distanceUnit.value))
const bestThrow     = computed(() => formatDistance(bestThrowM, distanceUnit.value))

const bars = [24, 32, 28, 40, 52, 36, 68]
const days = computed(() => t('discs.stats.weekdays'))
</script>

<template>
  <div class="stats-wrap">
    <!-- Speed chart -->
    <SdCard :padding="18">
      <div class="glass-card__header">
        <div class="stat-group">
          <div class="stat-label">{{ t('discs.stats.topSpeed') }}</div>
          <div class="stat-big">{{ topSpeed }}<span class="stat-unit">{{ topSpeedUnit }}</span></div>
        </div>
        <SdChip tone="gold">
          <template #icon><TrendingUp :size="12" /></template>
          +12%
        </SdChip>
      </div>
      <div class="chart">
        <div
          v-for="(h, i) in bars"
          :key="i"
          class="chart__bar"
          :class="{ 'chart__bar--gold': i === bars.length - 1 }"
          :style="{ height: h + '%' }"
        />
      </div>
      <div class="chart__labels">
        <span v-for="d in days" :key="d">{{ d }}</span>
      </div>
    </SdCard>

    <!-- RPM + Height tiles -->
    <div class="tile-row">
      <SdCard flex :padding="16">
        <div class="stat-label">{{ t('discs.stats.avgSpin') }}</div>
        <div class="stat-big">1 182<span class="stat-unit">rpm</span></div>
        <div class="gauge"><div class="gauge__fill" style="width: 62%;" /></div>
        <div class="trend trend--up">{{ t('discs.stats.trendUp') }}</div>
      </SdCard>
      <SdCard flex :padding="16">
        <div class="stat-label">{{ t('discs.stats.maxHeight') }}</div>
        <div class="stat-big">{{ maxHeight }}<span class="stat-unit">{{ maxHeightUnit }}</span></div>
        <div class="gauge"><div class="gauge__fill" style="width: 48%;" /></div>
        <div class="trend">{{ t('discs.stats.trendSame') }}</div>
      </SdCard>
    </div>

    <!-- Best throw -->
    <SdCard :padding="18">
      <div class="glass-card__header">
        <div class="stat-label">{{ t('discs.stats.bestThrow') }}</div>
        <SdChip tone="gold">
          <template #icon><Star :size="12" /></template>
          {{ bestThrow }}
        </SdChip>
      </div>
      <div class="best-throw">
        <div>
          <div class="throw-name">Long huck</div>
          <div class="throw-time">{{ t('discs.days.today') }} · 14:21 · 1 320 rpm</div>
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
}

.trend {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  margin-top: 6px;
}
.trend--up { color: var(--sd-success); }

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
