<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Crown, Eye, UserPlus, UserMinus, Clock, X, Loader2 } from 'lucide-vue-next'
import SdAvatar from '@/components/ui/SdAvatar.vue'
import { SdBtn, SdChip, SdCard, SdBottomSheet } from '@/components/ui'
import { useDiscs } from '@/composables/useDiscs'
import { useDiscInvitations } from '@/composables/useDiscInvitations'
import { useFriends } from '@/composables/useFriends'
import { useAuth } from '@/composables/useAuth'
import { mapAuthError } from '@/stores/auth'
import { useI18n } from '@/i18n'

const route = useRoute()
const { getDisc } = useDiscs()
const { user } = useAuth()
const { t } = useI18n()

const disc = computed(() => getDisc(route.params.id))

const {
  discInvites, discInvitesLoading, discInvitesError,
  discMembers, discMembersError,
  fetchDiscInvitations, inviteFriend, cancelInvitation,
  fetchDiscMembers, removeMember,
} = useDiscInvitations()
const { friends, friendsLoading, fetchFriends } = useFriends()

watch(() => route.params.id, (id) => {
  if (!id) return
  fetchDiscInvitations(id).catch(() => {})
  fetchDiscMembers(id).catch(() => {})
}, { immediate: true })

fetchFriends().catch(() => {})

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
  <div class="people-wrap">
    <!-- People with access -->
    <SdCard>
      <div class="card-row card-row--mb">
        <span class="card-label">{{ t('discs.people.withAccess') }}</span>
        <span class="count-label">{{ t('discs.people.peopleCount', { count: discMembers.length + 1 }) }}</span>
      </div>

      <div class="member-row">
        <SdAvatar :name="user?.name ?? '?'" :hue="210" :has-image="!!user?.hasAvatar" :image-url="user?.avatarUrl" />
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
        <SdAvatar :name="member.name" :hue="320" :has-image="!!member.hasAvatar" :image-url="member.avatarUrl" />
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
        <SdAvatar :name="inv.toName" :hue="260" :has-image="!!inv.toHasAvatar" :image-url="inv.toAvatarUrl" />
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

    <div class="nav-spacer" />

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
              <SdAvatar :name="f.name" :size="34" :has-image="!!f.hasAvatar" :image-url="f.avatarUrl" />
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
  </div>
</template>

<style scoped>
.people-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nav-spacer {
  height: var(--sd-nav-clearance);
  flex: none;
}

/* ≥768px: "People with access" and "Pending invites" side by side */
@media (min-width: 768px) {
  .people-wrap {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
  .nav-spacer {
    grid-column: 1 / -1;
  }
}

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

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin-icon {
  animation: spin 0.7s linear infinite;
}
</style>
