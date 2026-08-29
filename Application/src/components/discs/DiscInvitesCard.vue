<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { UserPlus, Clock, X, Loader2 } from 'lucide-vue-next'
import SdAvatar from '@/components/ui/SdAvatar.vue'
import { SdBtn, SdChip, SdCard, SdBottomSheet } from '@/components/ui'
import { useDiscInvitations } from '@/composables/useDiscInvitations'
import { useFriends } from '@/composables/useFriends'
import { mapAuthError } from '@/stores/auth'
import { useI18n } from '@/i18n'

const route = useRoute()
const { t } = useI18n()
const {
  discInvites, discInvitesLoading, discInvitesError,
  cancelInvitation, inviteFriend,
} = useDiscInvitations()
const { friends, friendsLoading } = useFriends()

// ── Cancel a pending invite ──────────────────────────────────────────────
const cancelingId = ref(null)
const cancelError = ref('')

async function handleCancelInvite(id) {
  cancelingId.value = id
  cancelError.value = ''
  try {
    await cancelInvitation(route.params.id, id)
  } catch (err) {
    cancelError.value = mapAuthError(err, t)
  } finally {
    cancelingId.value = null
  }
}

// ── Invite a friend ──────────────────────────────────────────────────────
const inviteSheet = ref(false)
const invitingId = ref(null)
const inviteError = ref('')

// Friends already invited to this disc don't show up again as candidates.
const inviteCandidates = computed(() => {
  const invitedIds = new Set(discInvites.value.map(i => i.toUserId))
  return friends.value.filter(f => !invitedIds.has(f.id))
})

function openInviteSheet() {
  inviteError.value = ''
  inviteSheet.value = true
}

async function handleInvite(friend) {
  invitingId.value = friend.id
  inviteError.value = ''
  try {
    await inviteFriend(route.params.id, friend.id)
  } catch (err) {
    inviteError.value = mapAuthError(err, t)
  } finally {
    invitingId.value = null
  }
}
</script>

<template>
  <!-- Pending invites -->
  <SdCard>
    <div class="card-row card-row--mb">
      <span class="card-label">{{ t('discs.people.pendingInvites') }}</span>
      <span v-if="discInvites.length" class="count-label">{{ discInvites.length }}</span>
    </div>

    <p v-if="discInvitesError" class="people-error">{{ discInvitesError }}</p>
    <p v-else-if="cancelError" class="people-error">{{ cancelError }}</p>
    <p v-else-if="!discInvitesLoading && discInvites.length === 0" class="people-empty-hint">
      {{ t('discs.people.noPendingInvites') }}
    </p>

    <div
      v-for="(inv, i) in discInvites"
      :key="inv.id"
      class="member-row"
      :class="{ 'member-row--border': i > 0 }"
    >
      <SdAvatar :name="inv.toName" :hue="260" />
      <div class="member-info">
        <div class="member-name">{{ inv.toName }}</div>
        <div class="member-email">{{ inv.toEmail }}</div>
      </div>
      <SdChip tone="gold">
        <template #icon><Clock :size="12" /></template>
        {{ t('discs.people.pending') }}
      </SdChip>
      <button
        class="remove-btn"
        :disabled="cancelingId === inv.id"
        @click="handleCancelInvite(inv.id)"
      >
        <Loader2 v-if="cancelingId === inv.id" :size="14" class="spin-icon" style="color: var(--sd-fg3);" />
        <X v-else :size="14" style="color: var(--sd-fg3);" />
      </button>
    </div>

    <SdBtn variant="ghost" size="sm" block class="invite-btn" @click="openInviteSheet">
      <template #icon-left><UserPlus :size="14" /></template>
      {{ t('discs.people.inviteFriend') }}
    </SdBtn>
  </SdCard>

  <!-- Invite a friend sheet -->
  <SdBottomSheet v-model="inviteSheet" :title="t('discs.people.inviteSheetTitle')">
    <div class="invite-stack">
      <p class="invite-hint">{{ t('discs.people.pickFriendHint') }}</p>
      <p v-if="inviteError" class="people-error">{{ inviteError }}</p>

      <p v-if="friendsLoading" class="people-empty-hint">{{ t('discs.people.loadingFriends') }}</p>

      <div v-else-if="inviteCandidates.length === 0" class="invite-empty">
        <p class="invite-empty__text">{{ t('discs.people.noFriendsYet') }}</p>
        <RouterLink to="/friends" class="invite-empty__link" @click="inviteSheet = false">
          {{ t('discs.people.addFriendsLink') }}
        </RouterLink>
      </div>

      <template v-else>
        <div class="invite-candidates">
          <div v-for="f in inviteCandidates" :key="f.friendshipId" class="invite-candidate-row">
            <SdAvatar :name="f.name" :size="34" />
            <div class="invite-candidate-info">
              <div class="invite-candidate-name">{{ f.name }}</div>
              <div class="invite-candidate-email">{{ f.email }}</div>
            </div>
            <SdBtn
              variant="primary"
              size="sm"
              :disabled="invitingId === f.id"
              @click="handleInvite(f)"
            >
              {{ invitingId === f.id ? t('discs.people.inviting') : t('discs.people.invite') }}
            </SdBtn>
          </div>
        </div>
        <RouterLink to="/friends" class="invite-more-link" @click="inviteSheet = false">
          {{ t('discs.people.addFriendsLink') }}
        </RouterLink>
      </template>
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
.people-empty-hint {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg3);
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

.invite-btn { margin-top: 12px; }

.invite-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}
.invite-hint {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg2);
  line-height: 1.4;
  margin: 0;
}

.invite-candidates {
  display: flex;
  flex-direction: column;
}
.invite-candidate-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid rgba(16, 42, 87, .06);
}
.invite-candidate-row:first-child { border-top: none; }
.invite-candidate-info { flex: 1; min-width: 0; }
.invite-candidate-name {
  font-family: var(--sd-font-body);
  font-weight: 600;
  font-size: 14px;
  color: var(--sd-fg1);
  line-height: 1.2;
}
.invite-candidate-email {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  margin-top: 2px;
}

.invite-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 20px 0;
}
.invite-empty__text {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg3);
  margin: 0;
}
.invite-empty__link,
.invite-more-link {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--sd-azure);
  text-decoration: none;
}
.invite-more-link {
  text-align: center;
  padding-top: 6px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin-icon {
  animation: spin 0.7s linear infinite;
}
</style>
