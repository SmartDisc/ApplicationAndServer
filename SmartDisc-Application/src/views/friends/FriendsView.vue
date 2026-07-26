<script setup>
import { onMounted } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import AddFriendSearch from '@/components/friends/AddFriendSearch.vue'
import IncomingRequests from '@/components/friends/IncomingRequests.vue'
import SentRequests from '@/components/friends/SentRequests.vue'
import FriendsList from '@/components/friends/FriendsList.vue'
import { useFriends } from '@/composables/useFriends'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const { fetchFriends, fetchRequests, fetchSentRequests, clearSearch } = useFriends()

// Load all four sections' data up front. This stays in the parent (rather than
// each child fetching on its own mount) because the request/sent sections are
// v-if-gated on their lists being non-empty — a child that never mounts could
// never trigger its own fetch.
onMounted(() => {
  clearSearch()
  fetchFriends().catch(() => {})
  fetchRequests().catch(() => {})
  fetchSentRequests().catch(() => {})
})
</script>

<template>
  <AppLayout :tabs="false">
    <SdAppBar back :title="t('friends.page.title')" />

    <div class="friends-grid">
      <AddFriendSearch />
      <IncomingRequests />
      <SentRequests />
      <FriendsList />
    </div>

    <div :style="{ height: 'var(--sd-nav-clearance)' }" />
  </AppLayout>
</template>

<style scoped>
/* Phones keep the natural stacked flow (each section brings its own
   margins); ≥768px the four section cards flow into two columns. */
@media (min-width: 768px) {
  .friends-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 16px;
    align-items: start;
  }
}
</style>
