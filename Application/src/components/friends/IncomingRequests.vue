<script setup>
import {ref} from 'vue'
import {Check, X, Loader2} from 'lucide-vue-next'
import SdAvatar from '@/components/ui/SdAvatar.vue'
import {SdList, SdListRow, SdSectionLabel} from '@/components/ui'
import {useFriends} from '@/composables/useFriends'
import {mapAuthError} from '@/stores/auth'
import {useI18n} from '@/i18n'

const {t} = useI18n()
const {requests, acceptRequest, declineRequest} = useFriends()

const requestActionId = ref(null)
const requestsActionError = ref('')

async function handleAccept(id) {
  requestActionId.value = id
  requestsActionError.value = ''
  try {
    await acceptRequest(id)
  } catch (err) {
    requestsActionError.value = mapAuthError(err, t)
  } finally {
    requestActionId.value = null
  }
}

async function handleDecline(id) {
  requestActionId.value = id
  requestsActionError.value = ''
  try {
    await declineRequest(id)
  } catch (err) {
    requestsActionError.value = mapAuthError(err, t)
  } finally {
    requestActionId.value = null
  }
}
</script>

<template>
  <div v-if="requests.length" class="friends-section">
    <SdSectionLabel>{{ t('friends.requests.label', { count: requests.length }) }}</SdSectionLabel>
    <p v-if="requestsActionError" class="friends-error">{{ requestsActionError }}</p>
    <SdList>
      <SdListRow
        v-for="r in requests"
        :key="r.id"
        :title="r.fromName"
        :subtitle="r.fromEmail"
      >
        <template #icon><SdAvatar :name="r.fromName" :size="38" /></template>
        <template #trailing>
          <div class="request-actions">
            <button
              class="icon-action icon-action--accept"
              :disabled="requestActionId === r.id"
              @click="handleAccept(r.id)"
            >
              <Loader2 v-if="requestActionId === r.id" :size="16" class="spin-icon" />
              <Check v-else :size="16" />
            </button>
            <button
              class="icon-action icon-action--decline"
              :disabled="requestActionId === r.id"
              @click="handleDecline(r.id)"
            >
              <Loader2 v-if="requestActionId === r.id" :size="16" class="spin-icon" />
              <X v-else :size="16" />
            </button>
          </div>
        </template>
      </SdListRow>
    </SdList>
  </div>
</template>

<style scoped>
.friends-section { margin-bottom: 24px; }

.friends-error {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-danger);
  margin: 0 0 10px;
}

.request-actions {
  display: flex;
  gap: 8px;
}

.icon-action {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid rgba(16, 42, 87, .14);
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  color: var(--sd-fg3);
  transition: background var(--sd-dur-fast) var(--sd-ease-out);
}
.icon-action:disabled { opacity: 0.5; cursor: not-allowed; }
.icon-action:not(:disabled):hover { background: rgba(16, 42, 87, .06); }

.icon-action--accept {
  color: var(--sd-azure);
  border-color: rgba(111, 147, 181, .4);
}
.icon-action--decline {
  color: var(--sd-danger);
  border-color: rgba(192, 88, 78, .3);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin-icon {
  animation: spin 0.7s linear infinite;
}
</style>
