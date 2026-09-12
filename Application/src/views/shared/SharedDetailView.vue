<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MoreHorizontal } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import SdThrowRow from '@/components/discs/SdThrowRow.vue'
import SdDiscImage from '@/components/discs/SdDiscImage.vue'
import SdAvatar from '@/components/ui/SdAvatar.vue'
import { SdCard, SdIconBtn, SdSectionLabel } from '@/components/ui'
import { useDiscs } from '@/composables/useDiscs'
import { useThrows, formatThrowTime } from '@/composables/useThrows'
import { useI18n } from '@/i18n'

const route  = useRoute()
const router = useRouter()
const { getSharedDisc } = useDiscs()
const { getThrows, fetchThrows } = useThrows()
const { t } = useI18n()
const disc = computed(() => getSharedDisc(route.params.id))
const throws = computed(() => getThrows(route.params.id))

onMounted(() => {
  fetchThrows(route.params.id).catch(() => {
    // throws just stays empty if this fails; template falls back to placeholders
  })
})
</script>

<template>
  <AppLayout>
    <SdAppBar back></SdAppBar>

    <!-- Hero card -->
    <SdCard v-if="disc" class="hero-card" :padding="18">
      <div class="hero-top">
        <SdDiscImage
          :image-url="disc.imageUrl"
          :size="54"
          :alt="t('discs.photo.alt', { name: disc.name })"
        />
        <div class="hero-info">
          <div class="hero-name">{{ disc.name }}</div>
          <div class="hero-owner">
            <SdAvatar
              :name="disc.owner || '?'"
              :size="18"
              :hue="260"
              :has-image="!!disc.ownerHasAvatar"
              :image-url="disc.ownerAvatarUrl"
            />
            <span class="hero-uuid">{{ t('shared.detail.ownedBy', { owner: disc.owner }) }}</span>
          </div>
        </div>
      </div>
    </SdCard>

    <!-- Throws -->
    <div class="section-header">
      <SdSectionLabel style="flex: 1; margin: 0;">{{ t('shared.detail.recentThrows') }}</SdSectionLabel>
      <span class="count">{{ throws.length }} {{ t('shared.detail.totalSuffix') }}</span>
    </div>

    <div class="throws-list">
      <SdThrowRow
        v-for="(thr, i) in throws"
        :key="thr.id"
        class="sd-stagger-in"
        :style="{ '--i': i }"
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

.hero-owner {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  margin-top: 5px;
}

.hero-owner .hero-uuid {
  margin-top: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

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
