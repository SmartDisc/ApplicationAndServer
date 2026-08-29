<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Disc3, Share2, Settings } from 'lucide-vue-next'
import { useI18n } from '@/i18n'

const route = useRoute()
const { t } = useI18n()

const tabs = computed(() => [
  { key: 'discs',    label: t('tabBar.myDiscs'),  icon: Disc3,    to: '/discs' },
  { key: 'shared',   label: t('tabBar.shared'),   icon: Share2,   to: '/shared' },
  { key: 'settings', label: t('tabBar.settings'), icon: Settings, to: '/settings' },
])
// Text labels are dropped from the bar itself (icons only, larger) but kept
// on each tab as an aria-label so the bar stays accessible/screen-reader friendly.

function isActive(tab) {
  return route.path.startsWith(tab.to)
}
</script>

<template>
  <nav class="tabbar">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.key"
      :to="tab.to"
      :class="['tabbar__item', { 'tabbar__item--on': isActive(tab) }]"
      :aria-label="tab.label"
    >
      <component :is="tab.icon" :size="24" :stroke-width="isActive(tab) ? 2.1 : 1.75" class="tabbar__icon" />
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  margin: 0 18px 26px;
  border-radius: var(--sd-r-pill);
  background: var(--sd-glass-light-bg);
  -webkit-backdrop-filter: var(--sd-glass-blur);
          backdrop-filter: var(--sd-glass-blur);
  border: 1px solid var(--sd-glass-light-border);
  box-shadow: var(--sd-shadow-glass);
  padding: 6px;
  display: flex;
  gap: 4px;
  flex: none;
}

.tabbar__item {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--sd-r-pill);
  color: var(--sd-fg2);
  padding: 13px 8px;
  text-decoration: none;
  transition: background var(--sd-dur-fast) var(--sd-ease-out),
              color var(--sd-dur-fast) var(--sd-ease-out);
}

.tabbar__icon { flex-shrink: 0; }

.tabbar__item--on {
  background: var(--sd-ink);
  color: #fff;
  box-shadow: var(--sd-shadow-sm);
}
</style>
