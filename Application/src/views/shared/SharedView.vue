<script setup>
import {onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {Bell, Search, Disc as DiscIcon, Users, Share2} from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import SdDiscCard from '@/components/discs/SdDiscCard.vue'
import {SdIconBtn, SdPageHeader, SdBtn} from '@/components/ui'
import {useDiscs} from '@/composables/useDiscs'
import {useNotifications} from '@/composables/useNotifications'
import {useI18n} from '@/i18n'

const router = useRouter()
const {sharedDiscs, sharedDiscsError, fetchSharedDiscs} = useDiscs()
const {unreadCount, fetchNotifications} = useNotifications()
const {t} = useI18n()

onMounted(() => {
  fetchSharedDiscs().catch(() => {
    // sharedDiscsError already holds a friendly message for the template
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
        <div class="shared-actions">
          <SdIconBtn variant="glass" to="/friends">
            <Users :size="17" :stroke-width="1.75"/>
          </SdIconBtn>
          <SdIconBtn variant="glass" to="/notifications" :badge="unreadCount > 0">
            <Bell :size="17" :stroke-width="1.75"/>
          </SdIconBtn>
          <SdIconBtn variant="glass" to="/search">
            <Search :size="17" :stroke-width="1.75"/>
          </SdIconBtn>
        </div>
      </template>
    </SdAppBar>

    <SdPageHeader
        class="shared-head"
        :eyebrow="t('shared.list.eyebrow')"
        :title="t('shared.list.title')"
    />

    <p v-if="sharedDiscsError" class="shared-error">{{ sharedDiscsError }}</p>

    <div v-if="!sharedDiscsError && sharedDiscs.length === 0" class="shared-empty">
      <div class="shared-empty__card">
        <p class="shared-empty__title">{{ t('shared.list.emptyTitle') }}</p>
        <p class="shared-empty__body">{{ t('shared.list.emptyBody') }}</p>
      </div>
    </div>

    <div v-else class="shared-list">
      <SdDiscCard
          v-for="disc in sharedDiscs"
          :key="disc.id"
          :name="disc.name"
          :uuid="`from ${disc.owner} · ${disc.uuid.slice(0, 11)}–`"
          :throws="disc.throws"
          :longest="disc.longest"
          :players="disc.players"
          :shared="true"
          @click="router.push(`/shared/${disc.id}`)"
      />
    </div>
  </AppLayout>
</template>

<style scoped>
.shared-head {
  margin-bottom: 16px;
}

.shared-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: var(--sd-nav-clearance);
}

@media (min-width: 768px) {
  .shared-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    align-items: stretch;
  }
}

@media (min-width: 1024px) {
  .shared-list {
    grid-template-columns: repeat(3, 1fr);
  }
}

.shared-error {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-danger);
  margin: 0 0 14px;
}

.shared-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 24px;
  margin-bottom: var(--sd-nav-clearance);
  height: 100%;
}

.shared-empty__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 320px;
  width: 100%;
  padding: 36px 26px;
}

.shared-empty__icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(140deg, var(--sd-ink-700), var(--sd-ink-900));
  color: var(--sd-fg-on-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 16px;
  box-shadow: var(--sd-shadow-md);
}

.shared-empty__title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--sd-fg1);
  margin: 0 0 6px;
}

.shared-empty__body {
  font-family: var(--sd-font-body);
  font-size: 14px;
  color: var(--sd-fg3);
  max-width: 280px;
  line-height: 1.5;
  margin: 0 0 20px;
}

.shared-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

</style>
