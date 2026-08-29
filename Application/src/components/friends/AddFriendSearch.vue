<script setup>
import {ref, watch} from 'vue'
import {UserPlus, Search} from 'lucide-vue-next'
import SdAvatar from '@/components/ui/SdAvatar.vue'
import {SdCard, SdField, SdBtn} from '@/components/ui'
import {useFriends} from '@/composables/useFriends'
import {mapAuthError} from '@/stores/auth'
import {sanitizeText} from '@/utils/sanitize'
import {useI18n} from '@/i18n'

const {t} = useI18n()
const {
  searchResults, searchLoading, searchError,
  searchUsers, clearSearch, sendRequest, fetchSentRequests,
} = useFriends()

const searchQuery = ref('')
const sendingId = ref(null)
const sendSuccess = ref('')
const sendError = ref('')

watch(searchQuery, (value) => {
  sendSuccess.value = ''
  sendError.value = ''
  searchUsers(value)
})

async function handleSendRequest(user) {
  sendingId.value = user.id
  sendError.value = ''
  sendSuccess.value = ''
  try {
    await sendRequest(user.email)
    sendSuccess.value = t('friends.add.sent', {name: user.name})
    searchQuery.value = ''
    clearSearch()
    fetchSentRequests().catch(() => {})
  } catch (err) {
    sendError.value = mapAuthError(err, t)
  } finally {
    sendingId.value = null
  }
}
</script>

<template>
  <SdCard class="add-card">
    <div class="card-row card-row--mb">
      <UserPlus :size="16" style="color: var(--sd-azure);" />
      <span class="card-label">{{ t('friends.add.title') }}</span>
    </div>
    <SdField
      v-model="searchQuery"
      :placeholder="t('friends.add.placeholder')"
      :sanitize="sanitizeText"
      :maxlength="254"
    >
      <template #icon><Search :size="16" /></template>
    </SdField>

    <p v-if="sendSuccess" class="add-success">{{ sendSuccess }}</p>
    <p v-if="sendError" class="add-error">{{ sendError }}</p>
    <p v-if="searchError" class="add-error">{{ searchError }}</p>

    <p v-if="searchLoading" class="add-status">{{ t('friends.add.searching') }}</p>
    <p v-else-if="searchQuery && !searchResults.length && !searchError" class="add-status">
      {{ t('friends.add.noResults') }}
    </p>

    <div v-if="searchResults.length" class="search-results">
      <div v-for="u in searchResults" :key="u.id" class="search-result-row">
        <SdAvatar :name="u.name" :size="34" />
        <div class="search-result-info">
          <div class="search-result-name">{{ u.name }}</div>
          <div class="search-result-email">{{ u.email }}</div>
        </div>
        <SdBtn
          variant="ghost"
          size="sm"
          :disabled="sendingId === u.id"
          @click="handleSendRequest(u)"
        >
          {{ sendingId === u.id ? t('friends.add.sending') : t('friends.add.send') }}
        </SdBtn>
      </div>
    </div>
  </SdCard>
</template>

<style scoped>
.add-card { margin-bottom: 24px; }

.card-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-row--mb { margin-bottom: 10px; }

.card-label {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  flex: 1;
}

.add-status {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg3);
  margin: 10px 2px 0;
}
.add-success {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-azure);
  margin: 10px 2px 0;
}
.add-error {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-danger);
  margin: 10px 2px 0;
}

.search-results {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}
.search-result-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid rgba(16, 42, 87, .06);
}
.search-result-row:first-child { border-top: none; }
.search-result-info { flex: 1; min-width: 0; }
.search-result-name {
  font-family: var(--sd-font-body);
  font-weight: 600;
  font-size: 14px;
  color: var(--sd-fg1);
  line-height: 1.2;
}
.search-result-email {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  margin-top: 2px;
}
</style>
