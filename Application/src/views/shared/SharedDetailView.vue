<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MoreHorizontal, Eye } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import SdStatTile from '@/components/ui/SdStatTile.vue'
import SdThrowRow from '@/components/discs/SdThrowRow.vue'
import { SdChip, SdCard, SdIconBtn, SdSectionLabel } from '@/components/ui'
import { useDiscs } from '@/composables/useDiscs'
import { formatThrowTime } from '@/composables/useThrows'
import { usePreferences } from '@/composables/usePreferences'
import { useI18n } from '@/i18n'
import { convertDistance, distanceUnitLabel } from '@/utils/units'

const route  = useRoute()
const router = useRouter()
const { getSharedDisc } = useDiscs()
const { distanceUnit } = usePreferences()
const { t } = useI18n()
const disc = computed(() => getSharedDisc(route.params.id))
const longest = computed(() => convertDistance(disc.value?.longest ?? 0, distanceUnit.value))
const longestUnit = computed(() => distanceUnitLabel(distanceUnit.value))
</script>

<template>
  <AppLayout>
    <SdAppBar back :title="disc?.name ?? ''" ></SdAppBar>

    <!-- Hero card -->
    <SdCard v-if="disc" class="hero-card" :padding="18">
      <div class="hero-top">
        <div class="hero-info">
          <div class="hero-name">{{ disc.name }}</div>
          <div class="hero-uuid">{{ disc.uuid }}</div>
          <div class="hero-uuid">{{ t('shared.detail.ownedBy', { owner: disc.owner }) }}</div>
        </div>
        <SdChip tone="read">
          <template #icon><Eye :size="12" /></template>
          {{ t('shared.detail.read') }}
        </SdChip>
      </div>
      <div class="stat-row">
        <SdStatTile :v="disc.throws" :k="t('shared.detail.throws')" />
        <SdStatTile :v="longest" :u="longestUnit" :k="t('shared.detail.longest')" />
        <SdStatTile :v="disc.topRpm" :k="t('shared.detail.topRpm')" />
      </div>
    </SdCard>

    <!-- Throws -->
    <div class="section-header">
      <SdSectionLabel style="flex: 1; margin: 0;">{{ t('shared.detail.recentThrows') }}</SdSectionLabel>
      <span class="count">{{ disc?.throws }} {{ t('shared.detail.totalSuffix') }}</span>
    </div>

    <div class="throws-list">
      <SdThrowRow
        v-for="thr in disc?.throws_list ?? []"
        :key="thr.id"
        :name="thr.name"
        :time="formatThrowTime(t, thr)"
        :rpm="thr.rpm"
        :fav="thr.fav"
        :auto="thr.auto"
        :readonly="true"
        @click="router.push(`/shared/${disc.id}/throw/${thr.id}`)"
      />
    </div>

    <div :style="{ height: 'var(--sd-nav-clearance)' }" />
  </AppLayout>
</template>

<style scoped>
.hero-card {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-top { display: flex; align-items: center; gap: 14px; }

.hero-info { flex: 1; min-width: 0; }
.hero-name {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 22px;
  letter-spacing: -0.01em;
  color: var(--sd-fg1);
  line-height: 1;
}
.hero-uuid {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  letter-spacing: 0.02em;
  margin-top: 4px;
}

.stat-row { display: flex; gap: 10px; }

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.count {
  font-family: var(--sd-font-display);
  font-size: 12px;
  color: var(--sd-fg3);
}

.throws-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 768px) {
  .throws-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    align-items: stretch;
  }
}
</style>
