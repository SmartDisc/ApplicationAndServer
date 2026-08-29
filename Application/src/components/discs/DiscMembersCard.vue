<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Crown, Eye, UserMinus } from 'lucide-vue-next'
import SdAvatar from '@/components/ui/SdAvatar.vue'
import { SdBtn, SdChip, SdCard, SdBottomSheet } from '@/components/ui'
import { useDiscInvitations } from '@/composables/useDiscInvitations'
import { useAuth } from '@/composables/useAuth'
import { mapAuthError } from '@/stores/auth'
import { useI18n } from '@/i18n'

const route = useRoute()
const { user } = useAuth()
const { t } = useI18n()
const { discMembers, discMembersError, removeMember } = useDiscInvitations()

// ── Remove a member's access ─────────────────────────────────────────────
// Revoking access silently cuts someone off from data they were viewing —
// arguably more consequential than removing a friend — so it goes through
// the same confirm-sheet pattern as FriendsView.vue's remove-friend flow
// rather than firing immediately on click.
const removeMemberSheet = ref(false)
const removeMemberTarget = ref(null)
const removingId = ref(null)
const removeError = ref('')

function confirmRemoveMember(member) {
  removeMemberTarget.value = member
  removeError.value = ''
  removeMemberSheet.value = true
}

async function handleRemoveMember() {
  if (!removeMemberTarget.value || removingId.value) return
  const userId = removeMemberTarget.value.id
  removingId.value = userId
  removeError.value = ''
  try {
    await removeMember(route.params.id, userId)
    removeMemberSheet.value = false
  } catch (err) {
    removeError.value = mapAuthError(err, t)
  } finally {
    removingId.value = null
  }
}
</script>

<template>
  <!-- People with access -->
  <SdCard>
    <div class="card-row card-row--mb">
      <span class="card-label">{{ t('discs.people.withAccess') }}</span>
      <span class="count-label">{{ t('discs.people.peopleCount', { count: discMembers.length + 1 }) }}</span>
    </div>

    <div class="member-row">
      <SdAvatar :name="user?.name ?? '?'" :hue="210" />
      <div class="member-info">
        <div class="member-name">{{ user?.name }}</div>
        <div class="member-email">{{ user?.email }}</div>
      </div>
      <SdChip tone="owner">
        <template #icon><Crown :size="12" /></template>
        {{ t('discs.people.owner') }}
      </SdChip>
    </div>

    <p v-if="discMembersError" class="people-error">{{ discMembersError }}</p>
    <p v-else-if="removeError" class="people-error">{{ removeError }}</p>

    <div
      v-for="member in discMembers"
      :key="member.id"
      class="member-row member-row--border"
    >
      <SdAvatar :name="member.name" :hue="320" />
      <div class="member-info">
        <div class="member-name">{{ member.name }}</div>
        <div class="member-email">{{ member.email }}</div>
      </div>
      <SdChip tone="read">
        <template #icon><Eye :size="12" /></template>
        {{ t('discs.people.read') }}
      </SdChip>
      <button class="remove-btn" @click="confirmRemoveMember(member)">
        <UserMinus :size="14" style="color: var(--sd-fg3);" />
      </button>
    </div>
  </SdCard>

  <!-- Remove member access confirm sheet -->
  <SdBottomSheet v-model="removeMemberSheet" :title="t('discs.people.removeMember.title')">
    <div class="remove-stack">
      <p class="remove-body">
        {{ t('discs.people.removeMember.body', { name: removeMemberTarget?.name ?? '' }) }}
      </p>
      <p v-if="removeError" class="people-error">{{ removeError }}</p>
      <div class="remove-actions">
        <SdBtn variant="ghost" size="md" style="flex:1;" @click="removeMemberSheet = false">
          {{ t('common.cancel') }}
        </SdBtn>
        <SdBtn
          variant="primary"
          size="md"
          style="flex:1;"
          class="danger-confirm-btn"
          :disabled="!!removingId"
          @click="handleRemoveMember"
        >
          {{ removingId ? t('discs.people.removeMember.removing') : t('discs.people.removeMember.confirm') }}
        </SdBtn>
      </div>
    </div>
  </SdBottomSheet>
</template>

<style scoped>
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
.count-label {
  font-family: var(--sd-font-display);
  font-size: 12px;
  color: var(--sd-fg3);
}

.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.member-row--border {
  border-top: 1px solid rgba(16, 42, 87, .06);
  padding-top: 12px;
  margin-top: 4px;
}

.member-info { flex: 1; min-width: 0; }
.member-name {
  font-family: var(--sd-font-body);
  font-weight: 600;
  font-size: 14px;
  color: var(--sd-fg1);
  line-height: 1.1;
}
.member-email {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  margin-top: 3px;
}

.people-error {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-danger);
  margin: 0 0 8px;
}

.remove-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  flex: none;
}
.remove-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
