<script setup>
import {ref} from 'vue'
import {UserMinus} from 'lucide-vue-next'
import SdAvatar from '@/components/ui/SdAvatar.vue'
import {SdCard, SdBtn, SdList, SdListRow, SdSectionLabel, SdBottomSheet} from '@/components/ui'
import {useFriends} from '@/composables/useFriends'
import {mapAuthError} from '@/stores/auth'
import {useI18n} from '@/i18n'

const {t} = useI18n()
const {friends, friendsError, removeFriend} = useFriends()

// ── Remove friend ────────────────────────────────────────────────────────
const removeSheet = ref(false)
const removeTarget = ref(null)
const removeLoading = ref(false)
const removeError = ref('')

function confirmRemove(friend) {
  removeTarget.value = friend
  removeError.value = ''
  removeSheet.value = true
}

async function handleRemove() {
  if (!removeTarget.value || removeLoading.value) return
  removeLoading.value = true
  removeError.value = ''
  try {
    await removeFriend(removeTarget.value.friendshipId)
    removeSheet.value = false
  } catch (err) {
    removeError.value = mapAuthError(err, t)
  } finally {
    removeLoading.value = false
  }
}
</script>

<template>
  <div class="friends-section">
    <SdSectionLabel>{{ t('friends.list.label', { count: friends.length }) }}</SdSectionLabel>
    <p v-if="friendsError" class="friends-error">{{ friendsError }}</p>
    <div v-else-if="friends.length === 0" class="friends-empty">
      <SdCard padding="28px 20px">
        <p class="friends-empty__title">{{ t('friends.list.emptyTitle') }}</p>
        <p class="friends-empty__body">{{ t('friends.list.emptyBody') }}</p>
      </SdCard>
    </div>
    <SdList v-else>
      <SdListRow
        v-for="f in friends"
        :key="f.friendshipId"
        :title="f.name"
        :subtitle="f.email"
      >
        <template #icon><SdAvatar :name="f.name" :size="38" /></template>
        <template #trailing>
          <button class="icon-action icon-action--decline" @click="confirmRemove(f)">
            <UserMinus :size="16" />
          </button>
        </template>
      </SdListRow>
    </SdList>

    <!-- Remove friend confirm sheet -->
    <SdBottomSheet v-model="removeSheet" :title="t('friends.remove.title')">
      <div class="remove-stack">
        <p class="remove-body">
          {{ t('friends.remove.body', { name: removeTarget?.name ?? '' }) }}
        </p>
        <p v-if="removeError" class="add-error">{{ removeError }}</p>
        <div class="remove-actions">
          <SdBtn variant="ghost" size="md" style="flex:1;" @click="removeSheet = false">
            {{ t('common.cancel') }}
          </SdBtn>
          <SdBtn
            variant="primary"
            size="md"
            style="flex:1;"
            class="danger-confirm-btn"
            :disabled="removeLoading"
            @click="handleRemove"
          >
            {{ removeLoading ? t('friends.remove.removing') : t('friends.remove.confirm') }}
          </SdBtn>
        </div>
      </div>
    </SdBottomSheet>
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

.friends-empty__title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 15px;
  color: var(--sd-fg1);
  margin: 0 0 4px;
  text-align: center;
}
.friends-empty__body {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg3);
  line-height: 1.5;
  margin: 0;
  text-align: center;
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

.icon-action--decline {
  color: var(--sd-danger);
  border-color: rgba(192, 88, 78, .3);
}

.add-error {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-danger);
  margin: 10px 2px 0;
}

.remove-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 4px;
}
.remove-body {
  font-family: var(--sd-font-body);
  font-size: 14px;
  color: var(--sd-fg2);
  line-height: 1.4;
  margin: 0;
}
.remove-actions {
  display: flex;
  gap: 10px;
}
.danger-confirm-btn {
  background: var(--sd-danger) !important;
  color: #fff !important;
}
.danger-confirm-btn:not(:disabled):hover { opacity: 0.9; }
</style>
