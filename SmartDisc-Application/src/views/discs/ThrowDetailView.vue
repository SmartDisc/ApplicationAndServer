<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import SdStatTile from '@/components/ui/SdStatTile.vue'
import { SdBtn, SdChip } from '@/components/ui'
import { MoreHorizontal, Star, Share2 } from 'lucide-vue-next'
import { useDiscs } from '@/composables/useDiscs'
import { useThrows, formatThrowTime } from '@/composables/useThrows'
import { useI18n } from '@/i18n'

const route = useRoute()
const { getDisc } = useDiscs()
const { getThrows, fetchThrows, toggleThrowFavorite } = useThrows()
const { t } = useI18n()

const disc = computed(() => getDisc(route.params.id))
const throw_ = computed(() =>
  getThrows(route.params.id).find(th => String(th.id) === String(route.params.throwId)) ?? null
)

onMounted(() => {
  // Covers direct navigation to this view before the throws list was fetched.
  fetchThrows(route.params.id).catch(() => {
    // throw_ just stays null if this fails; template falls back to placeholders
  })
})

const throwTime   = computed(() => (throw_.value ? formatThrowTime(t, throw_.value) : ''))
const durationS   = computed(() => (throw_.value ? `${(throw_.value.durationMs / 1000).toFixed(1)}s` : '—'))
const maxAlt      = computed(() => (throw_.value?.maxAltM != null ? `${throw_.value.maxAltM.toFixed(2)}m` : '—'))
const avgTemp     = computed(() => (throw_.value?.avgTempC != null ? `${throw_.value.avgTempC.toFixed(1)}°C` : '—'))
const recordedAt  = computed(() => (throw_.value?.recordedAt ? new Date(throw_.value.recordedAt).toLocaleString() : '—'))

function onToggleFav() {
  if (!throw_.value) return
  toggleThrowFavorite(route.params.id, throw_.value.id, !throw_.value.fav).catch(() => {
    // best-effort — star just won't flip if this fails
  })
}
</script>

<template>
  <div class="throw-screen">
    <div class="throw-bg">
      <div class="throw-bg__b1" />
      <div class="throw-bg__b2" />
    </div>

    <div class="throw-content">
      <SdAppBar back>
        <template #action>
          <button class="dark-icon-btn">
            <MoreHorizontal :size="17" :stroke-width="1.75" />
          </button>
        </template>
      </SdAppBar>

      <div class="throw-header">
        <div class="throw-eyebrow">{{ t('discs.throwDetail.throwOf', { name: disc?.name ?? '' }) }}</div>
        <h1 class="throw-title">
          {{ throw_?.name ?? t('discs.throwDetail.defaultName') }}
          <SdChip v-if="throw_?.auto" tone="gold" class="throw-title__badge">
            {{ t('discs.throwDetail.autoNamed') }}
          </SdChip>
        </h1>
        <p class="throw-time">{{ throwTime }}</p>
      </div>

      <!-- Stats: two stacked rows on phones, one combined row ≥768px -->
      <div class="stat-rows">
        <div class="stat-row stat-row--primary">
          <SdStatTile dark :v="throw_?.rpm ?? '—'" :k="t('discs.throwDetail.rpm')" />
          <SdStatTile dark :v="durationS" :k="t('discs.throwDetail.duration')" />
          <SdStatTile dark :v="maxAlt" :k="t('discs.throwDetail.maxAltitude')" />
        </div>

        <div class="stat-row stat-row--secondary">
          <SdStatTile dark :v="avgTemp" :k="t('discs.throwDetail.avgTemp')" />
          <SdStatTile dark :v="recordedAt" :k="t('discs.throwDetail.recordedAt')" />
        </div>
      </div>

      <div class="throw-meta">
        <span v-if="throw_?.recordedByName">{{ t('discs.throwDetail.recordedBy', { name: throw_.recordedByName }) }}</span>
        <span v-if="throw_?.sampleCount != null">{{ t('discs.throwDetail.sampleCount', { count: throw_.sampleCount }) }}</span>
      </div>

      <!-- Actions -->
      <div class="throw-actions">
        <SdBtn variant="dark-glass" size="md" @click="onToggleFav">
          <template #icon-left>
            <Star
              :size="16"
              :stroke-width="1.75"
              :fill="throw_?.fav ? 'var(--sd-gold-300)' : 'none'"
              :style="{ color: throw_?.fav ? 'var(--sd-gold-300)' : undefined }"
            />
          </template>
          {{ t('discs.throwDetail.favorite') }}
        </SdBtn>
        <SdBtn variant="gold" size="md" block>
          <template #icon-left><Share2 :size="16" :stroke-width="1.75" /></template>
          {{ t('discs.throwDetail.share') }}
        </SdBtn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.throw-screen {
  min-height: 100dvh;
  background: var(--sd-ink-900);
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  padding-left: env(safe-area-inset-left, 0);
  padding-right: env(safe-area-inset-right, 0);
}

.throw-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.throw-bg__b1 {
  position: absolute;
  width: 380px;
  height: 380px;
  left: -120px;
  top: -120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(111, 147, 181, .30), transparent 65%);
}
.throw-bg__b2 {
  position: absolute;
  width: 360px;
  height: 360px;
  right: -140px;
  top: 28%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(222, 195, 140, .28), transparent 60%);
}

.throw-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: var(--sd-content-max);
  display: flex;
  flex-direction: column;
  padding: 0 var(--sd-gutter) 32px;
  padding-top: env(safe-area-inset-top, 0);
}

/* Override AppBar styles for dark background */
.throw-content :deep(.appbar__back) {
  background: rgba(255, 255, 255, .12);
  border-color: rgba(255, 255, 255, .18);
  color: #fff;
}
.throw-content :deep(.appbar__title) {
  color: var(--sd-fg-on-dark);
}

.dark-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .12);
  border: 1px solid rgba(255, 255, 255, .18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
}

.throw-eyebrow {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sd-gold-300);
  margin: 0 0 8px;
}
.throw-title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 26px;
  letter-spacing: -0.01em;
  color: #fff;
  margin: 0 0 4px;
  line-height: 1.05;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.throw-title__badge {
  font-size: 10px;
  vertical-align: middle;
}
.throw-time {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg2-on-dark);
  margin: 0 0 14px;
}

.stat-row {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

/* ≥768px: widen the column and let all five stat tiles share one row */
@media (min-width: 768px) {
  .throw-content {
    max-width: var(--sd-content-max-md);
    padding-left: 32px;
    padding-right: 32px;
  }

  .stat-rows {
    display: flex;
    gap: 10px;
    margin-bottom: 14px;
  }
  .stat-row {
    margin-bottom: 0;
  }
  /* 3 + 2 tiles → equal widths across the combined row */
  .stat-row--primary { flex: 3; }
  .stat-row--secondary { flex: 2; }
}

.throw-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--sd-font-body);
  font-size: 12px;
  color: var(--sd-fg2-on-dark);
  margin: 0 0 18px;
}

.throw-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
</style>
