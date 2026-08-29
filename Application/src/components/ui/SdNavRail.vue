<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Disc3, Share2, Settings, Users, Bell, Search } from 'lucide-vue-next'
import { useI18n } from '@/i18n'
import { useNotifications } from '@/composables/useNotifications'

const route = useRoute()
const { t } = useI18n()
const { unreadCount } = useNotifications()

// Tablet-only vertical navigation rail (shown ≥768px by the layout). Mirrors
// the bottom tab bar's three destinations and adds the screens that are
// otherwise only reachable from the My Discs app-bar icons.
const items = computed(() => [
  { key: 'discs',         label: t('tabBar.myDiscs'),            icon: Disc3,    to: '/discs' },
  { key: 'shared',        label: t('tabBar.shared'),             icon: Share2,   to: '/shared' },
  { key: 'friends',       label: t('friends.page.title'),        icon: Users,    to: '/friends' },
  { key: 'notifications', label: t('notifications.inbox.title'), icon: Bell,     to: '/notifications' },
  { key: 'search',        label: t('search.title'),              icon: Search,   to: '/search' },
  { key: 'settings',      label: t('tabBar.settings'),           icon: Settings, to: '/settings' },
])

function isActive(item) {
  return route.path.startsWith(item.to)
}
</script>

<template>
  <nav class="navrail">
    <RouterLink
      v-for="item in items"
      :key="item.key"
      :to="item.to"
      :class="['navrail__item', { 'navrail__item--on': isActive(item) }]"
      :aria-label="item.label"
    >
      <span class="navrail__icon-wrap">
        <component :is="item.icon" :size="20" :stroke-width="isActive(item) ? 2.1 : 1.75" class="navrail__icon" />
        <span v-if="item.key === 'notifications' && unreadCount > 0" class="navrail__badge" />
      </span>
      <span class="navrail__label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.navrail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: var(--sd-r-lg);
  background: var(--sd-glass-light-bg);
  -webkit-backdrop-filter: var(--sd-glass-blur);
          backdrop-filter: var(--sd-glass-blur);
  border: 1px solid var(--sd-glass-light-border);
  box-shadow: var(--sd-shadow-glass);
  flex: none;
  min-width: 180px;
}

.navrail__item {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: var(--sd-r-pill);
  color: var(--sd-fg2);
  padding: 11px 14px;
  text-decoration: none;
  transition: background var(--sd-dur-fast) var(--sd-ease-out),
              color var(--sd-dur-fast) var(--sd-ease-out);
}
.navrail__item:hover:not(.navrail__item--on) {
  background: rgba(16, 42, 87, .06);
}

.navrail__icon-wrap {
  position: relative;
  display: flex;
  flex: none;
}
.navrail__icon { flex-shrink: 0; }

.navrail__badge {
  position: absolute;
  top: -2px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--sd-gold-400);
}

.navrail__label {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13.5px;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.navrail__item--on {
  background: var(--sd-ink);
  color: #fff;
  box-shadow: var(--sd-shadow-sm);
}
</style>
