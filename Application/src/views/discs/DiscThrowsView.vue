<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SdThrowRow from '@/components/discs/SdThrowRow.vue'
import { useThrows, formatThrowTime } from '@/composables/useThrows'
import { useI18n } from '@/i18n'

const route  = useRoute()
const router = useRouter()
const { getThrows, fetchThrows, toggleThrowFavorite } = useThrows()
const { t } = useI18n()

const throws = computed(() => getThrows(route.params.id))

onMounted(() => {
  fetchThrows(route.params.id).catch(() => {
    // throwsError already holds a friendly message if the caller needs it
  })
})

function onToggleFav(thr) {
  toggleThrowFavorite(route.params.id, thr.id, !thr.fav).catch(() => {
    // best-effort — star just won't flip if this fails
  })
}
</script>

<template>
  <div class="throws-wrap">
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
        @toggle-fav="onToggleFav(thr)"
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
