<script setup>
import {ref, computed, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {UserPlus, UserCheck, Share2, CheckCircle2, CheckCheck, Check, X, Loader2} from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import {useNotifications, bucketNotificationDate} from '@/composables/useNotifications'
import {useFriends} from '@/composables/useFriends'
import {useDiscInvitations} from '@/composables/useDiscInvitations'
import {mapAuthError} from '@/stores/auth'
import {useI18n} from '@/i18n'

const router = useRouter()
const {
  notifications,
  notificationsLoading,
  notificationsError,
  unreadCount,
  fetchNotifications,
  markRead,
  markAllRead,
} = useNotifications()
const {requests, acceptRequest, declineRequest, fetchRequests} = useFriends()
const {myInvites, acceptInvitation, declineInvitation, fetchMyInvitations} = useDiscInvitations()
const {t, language} = useI18n()

onMounted(() => {
  fetchNotifications().catch(() => {
    // notificationsError already holds a friendly message for the template
  })
  // Load the real pending-state lists too, so button-gating reflects the true
  // friendship/invitation state regardless of which view the user came from
  // (a request resolved on the Friends page must not still show live buttons
  // here). Each fetch is independently guarded so one failing doesn't block
  // the others.
  fetchRequests().catch(() => {})
  fetchMyInvitations().catch(() => {})
})

// A friend_request / disc_invitation notification row is a permanent historical
// record on the backend — it keeps coming back from fetchNotifications() even
// after the underlying friendship/invitation is resolved. So we can't trust the
// notification alone to decide whether accept/decline is still actionable; we
// check it against the live singleton pending lists (shared app-wide), which any
// view — Friends page, disc People page, or this inbox — keeps in sync.
function isStillPending(n) {
  if (n.type === 'friend_request') return requests.value.some(r => r.id === n.data.friendshipId)
  if (n.type === 'disc_invitation') return myInvites.value.some(i => i.id === n.data.invitationId)
  return false
}

// ── Accept/decline a friend request or disc-share invitation inline,
// without leaving the inbox. A friend_request is keyed by its friendshipId,
// a disc_invitation by its invitationId — independent numeric sequences
// from different DB tables, so the same raw id can legitimately mean two
// different things. All bookkeeping below (resolvedRequests/respondingId/
// respondErrors) therefore uses a composite "type:id" key via respondKey()
// so a friendshipId and an invitationId can never collide, even if they
// happen to share the same number. The actual API calls still use the raw
// numeric id, since that's what the backend expects.
const respondingId = ref(null)
const resolvedRequests = ref(new Set())
const respondErrors = ref({})

function respondKey(n) {
  return `${n.type}:${n.data.friendshipId ?? n.data.invitationId}`
}

// The accept/decline flow is identical for every actionable notification —
// only the id field it reads and the API call it makes differ. `idField` picks
// the raw numeric id out of the payload (friendshipId vs invitationId — see the
// respondKey note above on why they can't share a composite key), and `action`
// is the composable call to run. All the guarding/bookkeeping/mark-read logic
// (which drives the cross-view pending-state sync) lives here, once.
async function respondToNotification(n, {idField, action}) {
  const id = n.data[idField]
  const key = respondKey(n)
  if (!id || respondingId.value === key) return
  respondingId.value = key
  delete respondErrors.value[key]
  try {
    await action(id)
    resolvedRequests.value.add(key)
    if (!n.read) markRead(n.id).catch(() => {
    })
  } catch (err) {
    respondErrors.value = {...respondErrors.value, [key]: mapAuthError(err, t)}
  } finally {
    respondingId.value = null
  }
}

function onAccept(n) {
  return n.type === 'friend_request'
      ? respondToNotification(n, {idField: 'friendshipId', action: acceptRequest})
      : respondToNotification(n, {idField: 'invitationId', action: acceptInvitation})
}

function onDecline(n) {
  return n.type === 'friend_request'
      ? respondToNotification(n, {idField: 'friendshipId', action: declineRequest})
      : respondToNotification(n, {idField: 'invitationId', action: declineInvitation})
}

// Maps each backend notification `type` to an icon, a visual tone (reusing
// the existing gold/glass avatar treatments), and title/desc builders that
// interpolate the notification's `data` payload via t().
const NOTIF_META = {
  friend_request: {
    icon: UserPlus,
    tone: 'gold',
    title: d => t('notifications.inbox.friendRequestTitle', {name: d.fromName}),
    desc: () => t('notifications.inbox.friendRequestDesc'),
  },
  friend_accepted: {
    icon: UserCheck,
    tone: 'glass',
    title: d => t('notifications.inbox.friendAcceptedTitle', {name: d.byName}),
    desc: () => t('notifications.inbox.friendAcceptedDesc'),
  },
  disc_invitation: {
    icon: Share2,
    tone: 'gold',
    title: d => t('notifications.inbox.discInvitationTitle', {name: d.fromName, disc: d.discName}),
    desc: () => t('notifications.inbox.discInvitationDesc'),
  },
  disc_invitation_accepted: {
    icon: CheckCircle2,
    tone: 'glass',
    title: d => t('notifications.inbox.joinedTitle', {name: d.byName, disc: d.discName}),
    desc: () => t('notifications.inbox.discInvitationAcceptedDesc'),
  },
}

function metaFor(n) {
  return NOTIF_META[n.type] ?? NOTIF_META.friend_request
}

// Groups notifications by day using relative labels (Today / Yesterday / a
// localized date), newest first — the list already arrives newest-first
// from the backend so bucket order falls out naturally.
const groups = computed(() => {
  const order = []
  const byLabel = new Map()

  for (const n of notifications.value) {
    const {dayKey, dateLabel, clock} = bucketNotificationDate(n.createdAt, language.value)
    const label = dayKey === 'today'
        ? t('notifications.inbox.today')
        : dayKey === 'yesterday'
            ? t('notifications.inbox.yesterday')
            : dateLabel

    if (!byLabel.has(label)) {
      byLabel.set(label, [])
      order.push(label)
    }
    byLabel.get(label).push({...n, clock})
  }

  return order.map(label => ({label, items: byLabel.get(label)}))
})

function onNotifClick(n) {
  if (!n.read) markRead(n.id).catch(() => {
  })
  // disc_invitation_accepted fires for the disc's OWNER, who can manage
  // access there. disc_invitation (like friend_request) is handled inline
  // via its accept/decline buttons, so clicking the row just marks it read.
  if (n.type === 'disc_invitation_accepted' && n.data.discId) {
    router.push(`/discs/${n.data.discId}/people`)
  } else if (n.type === 'friend_request' || n.type === 'friend_accepted') {
    // Both land on the Friends page: a pending request shows there ready to
    // accept/decline, an accepted one just shows up in the friends list.
    router.push('/friends')
  }
}

function onMarkAllRead() {
  markAllRead().catch(() => {
  })
}
</script>

<template>
  <AppLayout :tabs="false">
    <SdAppBar back :title="t('notifications.inbox.title')">
      <template #action>
        <button class="mark-all" :disabled="unreadCount === 0" @click="onMarkAllRead">
          <CheckCheck :size="14" :stroke-width="2.25"/>
          <span>{{ t('notifications.inbox.markAllRead') }}</span>
        </button>
      </template>
    </SdAppBar>

    <p v-if="notificationsLoading" class="notif-loading">{{ t('notifications.inbox.loading') }}</p>

    <template v-else>
      <p v-if="notificationsError" class="notif-error">{{ notificationsError }}</p>

      <div v-else-if="notifications.length === 0" class="notif-empty">
        <div>
          <p class="notif-empty__title">{{ t('notifications.inbox.emptyTitle') }}</p>
          <p class="notif-empty__body">{{ t('notifications.inbox.emptyBody') }}</p>
        </div>
      </div>

      <template v-else>
        <template v-for="group in groups" :key="group.label">
          <p class="day-label">{{ group.label }}</p>

          <div
              v-for="n in group.items"
              :key="n.id"
              :class="['notif', { 'notif--unread': !n.read }]"
              @click="onNotifClick(n)"
          >
            <div :class="['notif__dot', { 'notif__dot--read': n.read }]"/>
            <div :class="['notif__avatar', `notif__avatar--${metaFor(n).tone}`]">
              <component
                  :is="metaFor(n).icon"
                  :size="18"
                  :style="{ color: metaFor(n).tone === 'gold' ? '#5a4416' : 'var(--sd-ink)' }"
              />
            </div>
            <div class="notif__body">
              <div class="notif__title">{{ metaFor(n).title(n.data) }}</div>
              <div class="notif__desc">{{ metaFor(n).desc(n.data) }}</div>
              <div class="notif__meta">{{ n.clock }}</div>
              <p v-if="respondErrors[respondKey(n)]" class="notif__error">
                {{ respondErrors[respondKey(n)] }}
              </p>
            </div>

            <div
                v-if="(n.type === 'friend_request' || n.type === 'disc_invitation') && isStillPending(n) && !resolvedRequests.has(respondKey(n))"
                class="notif__actions"
                @click.stop
            >
              <button
                  class="notif-action notif-action--decline"
                  :disabled="respondingId === respondKey(n)"
                  @click="onDecline(n)"
              >
                <Loader2
                    v-if="respondingId === respondKey(n)"
                    :size="15"
                    class="spin-icon"
                />
                <X v-else :size="15"/>
              </button>
              <button
                  class="notif-action notif-action--accept"
                  :disabled="respondingId === respondKey(n)"
                  @click="onAccept(n)"
              >
                <Loader2
                    v-if="respondingId === respondKey(n)"
                    :size="15"
                    class="spin-icon"
                />
                <Check v-else :size="15"/>
              </button>
            </div>
            <span
                v-else-if="(n.type === 'friend_request' || n.type === 'disc_invitation') && (resolvedRequests.has(respondKey(n)) || !isStillPending(n))"
                class="notif__resolved"
            >
              {{ t('notifications.inbox.requestHandled') }}
            </span>
          </div>
        </template>
      </template>
    </template>

    <div style="height: 40px;"/>
  </AppLayout>
</template>

<style scoped>
.mark-all {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 12.5px;
  line-height: 1;
  color: var(--sd-ink);
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
  border-radius: var(--sd-r-pill);
  -webkit-backdrop-filter: var(--sd-glass-blur-thin);
  backdrop-filter: var(--sd-glass-blur-thin);
  box-shadow: var(--sd-shadow-glass);
  white-space: nowrap;
  cursor: pointer;
  padding: 7px 12px;
  transition: background var(--sd-dur-fast) var(--sd-ease-out),
  opacity var(--sd-dur-fast) var(--sd-ease-out),
  transform var(--sd-dur-fast) var(--sd-ease-out);
}

.mark-all:not(:disabled):hover {
  background: rgba(255, 255, 255, .72);
}

.mark-all:not(:disabled):active {
  transform: scale(0.97);
}

.mark-all:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.day-label {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sd-azure);
  margin: 14px 0 4px;
}

.day-label:first-child {
  margin-top: 8px;
}

.notif {
  display: flex;
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid rgba(16, 42, 87, .07);
  cursor: pointer;
}

.notif__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--sd-gold-400);
  margin-top: 6px;
  flex: none;
}

.notif__dot--read {
  background: transparent;
}

.notif__avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(140deg, #1d3d72, #0a1c3d);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.notif__avatar--gold {
  background: var(--sd-gold-grad);
}

.notif__avatar--glass {
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
  color: var(--sd-ink);
}

.notif__body {
  flex: 1;
  min-width: 0;
}

/* ≥768px: keep the text measure readable in the wider column */
@media (min-width: 768px) {
  .notif__body {
    max-width: 640px;
  }
}

.notif__title {
  font-family: var(--sd-font-body);
  font-weight: 600;
  font-size: 14px;
  color: var(--sd-fg1);
  line-height: 1.25;
}

.notif__desc {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg2);
  margin-top: 3px;
  line-height: 1.35;
}

.notif__meta {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  margin-top: 4px;
  letter-spacing: 0.02em;
}

.notif__error {
  font-family: var(--sd-font-body);
  font-size: 12px;
  color: var(--sd-danger);
  margin: 4px 0 0;
}

.notif__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.notif-action {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  transition: opacity var(--sd-dur-fast) var(--sd-ease-out);
}

.notif-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notif-action--decline {
  background: rgba(192, 88, 78, .12);
  color: var(--sd-danger);
}

.notif-action--accept {
  background: var(--sd-gold-grad);
  color: #5a4416;
}

.notif__resolved {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  color: var(--sd-fg3);
  flex: none;
  align-self: center;
}

.notif-loading {
  font-family: var(--sd-font-body);
  font-size: 14px;
  color: var(--sd-fg3);
  text-align: center;
  padding: 40px 0;
}

.notif-error {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-danger);
  margin: 16px 0;
}

.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 56px 24px;
  height: 100%;
}

.notif-empty__icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--sd-gold-grad);
  color: #5a4416;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 16px;
  box-shadow: 0 10px 24px rgba(184, 146, 79, .35);
}

.notif-empty__title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--sd-fg1);
  margin: 0 0 6px;
}

.notif-empty__body {
  font-family: var(--sd-font-body);
  font-size: 14px;
  color: var(--sd-fg3);
  max-width: 280px;
  line-height: 1.5;
  margin: 0;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spin-icon {
  animation: spin 0.7s linear infinite;
}
</style>
