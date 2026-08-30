<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, Search, Users, QrCode, Disc as DiscIcon } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import SdDiscCard from '@/components/discs/SdDiscCard.vue'
import { SdIconBtn, SdPageHeader } from '@/components/ui'
import { useDiscs, formatLastActive } from '@/composables/useDiscs'
import { useNotifications } from '@/composables/useNotifications'
import { useFavorites } from '@/composables/useFavorites'
import { useI18n } from '@/i18n'
import { SdBtn } from '@/components/ui'

const router = useRouter()
const { discs, discsError, fetchDiscs } = useDiscs()
const { unreadCount, fetchNotifications } = useNotifications()
const { isFavorite, toggleFavorite } = useFavorites()
const { t } = useI18n()

onMounted(() => {
  fetchDiscs().catch(() => {
    // discsError already holds a friendly message for the template
  })
  fetchNotifications().catch(() => {
    // badge just stays hidden if this fails
  })
})
</script>

<template>
  <AppLayout>
    <SdAppBar title="">
      <template #action>
        <div class="mydisc-actions">
          <SdIconBtn variant="glass" to="/friends">
            <Users :size="17" :stroke-width="1.75" />
          </SdIconBtn>
          <SdIconBtn variant="glass" to="/notifications" :badge="unreadCount > 0">
            <Bell :size="17" :stroke-width="1.75" />
          </SdIconBtn>
          <SdIconBtn variant="glass" to="/search">
            <Search :size="17" :stroke-width="1.75" />
          </SdIconBtn>
        </div>
      </template>
    </SdAppBar>

    <SdPageHeader
      class="mydisc-head"
      :eyebrow="t('discs.myDiscs.eyebrow')"
      :title="t('discs.myDiscs.title')"
    />

    <p v-if="discsError" class="mydisc-error">{{ discsError }}</p>

    <div v-if="!discsError && discs.length === 0" class="discs-empty">
      <div class="discs-empty__card">
        <p class="discs-empty__title">{{ t('discs.myDiscs.emptyTitle') }}</p>
        <p class="discs-empty__body">{{ t('discs.myDiscs.emptyBody') }}</p>

        <SdBtn variant="primary" size="m" block @click="router.push('/discs/add')">
          {{ t('discs.myDiscs.emptyCta') }}
        </SdBtn>
      </div>
    </div>

    <div class="mydisc-list">
      <SdDiscCard
        v-for="disc in discs"
        :key="disc.id"
        :name="disc.name"
        :uuid="disc.uuid"
        :image-url="disc.imageUrl"
        :fav="isFavorite(disc.id)"
        :last-active="formatLastActive(t, disc.lastActive)"
        @click="router.push(`/discs/${disc.id}`)"
        @toggle-fav="toggleFavorite(disc.id)"
      />
    </div>

    <RouterLink to="/discs/add" class="fab">
      <QrCode :size="26" :stroke-width="2" />
    </RouterLink>
  </AppLayout>
</template>

<style scoped>
.mydisc-head { margin-bottom: 14px; }

.mydisc-error {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-danger);
  margin: 0 0 14px;
}

.mydisc-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: var(--sd-nav-clearance);
}

@media (min-width: 768px) {
  .mydisc-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    align-items: stretch;
    /* Keep the last row reachable above the floating FAB */
    padding-bottom: 88px;
  }
}

@media (min-width: 1024px) {
  .mydisc-list {
    grid-template-columns: repeat(3, 1fr);
  }
}

.mydisc-actions {
  margin-top: 2px;
  margin-right: 3px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.discs-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 24px;
  margin-bottom: var(--sd-nav-clearance);
  height: 100%;
}

.discs-empty__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 320px;
  width: 100%;
  padding: 36px 26px;
}

.discs-empty__icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--sd-gold-grad);
  color: #5a4416;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 16px;
  box-shadow: 0 10px 24px rgba(184, 146, 79, .35);
}

.discs-empty__title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--sd-fg1);
  margin: 0 0 6px;
}

.discs-empty__body {
  font-family: var(--sd-font-body);
  font-size: 14px;
  color: var(--sd-fg3);
  max-width: 280px;
  line-height: 1.5;
  margin: 0 0 20px;
}

/* Sticks to the bottom of the scrolling content column (.app-frame), so it
   stays aligned with the content at any column width — no viewport math. */
.fab {
  position: sticky;
  bottom: 24px;
  margin-top: auto;
  margin-left: auto;
  flex: none;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--sd-gold-grad);
  color: #5a4416;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14px 32px rgba(184, 146, 79, .5), var(--sd-shadow-md);
  z-index: 10;
  border: 1px solid rgba(255, 255, 255, .4);
  text-decoration: none;
}
.fab:active { transform: scale(0.93); }
</style>
