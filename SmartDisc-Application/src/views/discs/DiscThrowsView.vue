<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SdThrowRow from '@/components/discs/SdThrowRow.vue'
import { SdChip } from '@/components/ui'
import { Star, Calendar } from 'lucide-vue-next'
import { useThrows, formatThrowTime } from '@/composables/useThrows'
import { useI18n } from '@/i18n'

const route  = useRoute()
const router = useRouter()
const { getThrows, fetchThrows } = useThrows()
const { t } = useI18n()

const throws = computed(() => getThrows(route.params.id))

onMounted(() => {
  fetchThrows(route.params.id).catch(() => {
    // throwsError already holds a friendly message if the caller needs it
  })
})
</script>

<template>
  <div class="throws-wrap">
    <!-- Filter chips -->
    <div class="throws-filters">
      <SdChip tone="solid-light">
        <template #icon><Star :size="12" /></template>
        {{ t('discs.throws.favorites') }}
      </SdChip>
      <SdChip tone="solid-light">
        <template #icon><Calendar :size="12" /></template>
        {{ t('discs.throws.today') }}
      </SdChip>
      <span class="throws-filters__sort">{{ t('discs.throws.newestFirst') }}</span>
    </div>

    <div class="throws-list">
      <SdThrowRow
        v-for="thr in throws"
        :key="thr.id"
        :name="thr.name"
        :time="formatThrowTime(t, thr)"
        :rpm="thr.rpm"
        :fav="thr.fav"
        :auto="thr.auto"
        @click="router.push(`/discs/${route.params.id}/throw/${thr.id}`)"
      />
    </div>

    <div v-if="!throws.length" class="throws-empty">
      {{ t('discs.throws.empty') }}
    </div>
  </div>
</template>

<style scoped>
.throws-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: var(--sd-nav-clearance);
}

.throws-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.throws-filters__sort {
  margin-left: auto;
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  letter-spacing: 0.08em;
  text-transform: uppercase;
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

.throws-empty {
  font-family: var(--sd-font-body);
  font-size: 14px;
  color: var(--sd-fg3);
  text-align: center;
  padding: 32px 0;
}
</style>
