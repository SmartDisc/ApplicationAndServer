import { ref, readonly } from 'vue'
import { apiFetch } from '@/services/api'
import { useAuthStore, mapAuthError } from '@/stores/auth'
import { useI18n } from '@/i18n'

// Pending invites for whichever disc is currently open (owner view):
// [{ id, toUserId, toName, toEmail, createdAt }]
const _discInvites = ref([])
const _discInvitesLoading = ref(false)
const _discInvitesError = ref(null)

// Pending disc invites addressed to the signed-in user (invitee view):
// [{ id, discId, discName, fromName, fromEmail, createdAt }]
const _myInvites = ref([])
const _myInvitesLoading = ref(false)
const _myInvitesError = ref(null)

// People (besides the owner) with access to whichever disc is currently open
// (owner view): [{ id, name, email }]
const _discMembers = ref([])
const _discMembersLoading = ref(false)
const _discMembersError = ref(null)

export function useDiscInvitations() {
  const authStore = useAuthStore()
  const { t } = useI18n()

  /** Loads pending invites for a disc the signed-in user owns. */
  async function fetchDiscInvitations(discId) {
    _discInvitesLoading.value = true
    _discInvitesError.value = null
    try {
      const invites = await apiFetch(`/api/discs/${discId}/invitations`, { token: authStore.token })
      _discInvites.value = invites
    } catch (err) {
      _discInvitesError.value = mapAuthError(err, t)
      throw err
    } finally {
      _discInvitesLoading.value = false
    }
  }

  /** Invites an accepted friend to a disc. Throws ApiError (404/409) on failure. */
  async function inviteFriend(discId, friendId) {
    const invite = await apiFetch(`/api/discs/${discId}/invitations`, {
      method: 'POST',
      body: { friendId },
      token: authStore.token,
    })
    _discInvites.value = [..._discInvites.value, invite]
    return invite
  }

  /** Cancels a pending invite the signed-in user sent as the disc's owner. */
  async function cancelInvitation(discId, invitationId) {
    await apiFetch(`/api/discs/${discId}/invitations/${invitationId}`, {
      method: 'DELETE',
      token: authStore.token,
    })
    _discInvites.value = _discInvites.value.filter(i => i.id !== invitationId)
  }

  /** Loads pending disc invites addressed to the signed-in user. */
  async function fetchMyInvitations() {
    _myInvitesLoading.value = true
    _myInvitesError.value = null
    try {
      const invites = await apiFetch('/api/disc-invitations', { token: authStore.token })
      _myInvites.value = invites
    } catch (err) {
      _myInvitesError.value = mapAuthError(err, t)
      throw err
    } finally {
      _myInvitesLoading.value = false
    }
  }

  /** Accepts an incoming disc invite — the disc becomes visible under Shared. */
  async function acceptInvitation(id) {
    const result = await apiFetch(`/api/disc-invitations/${id}/accept`, {
      method: 'POST',
      token: authStore.token,
    })
    _myInvites.value = _myInvites.value.filter(i => i.id !== id)
    return result
  }

  /** Declines an incoming disc invite. */
  async function declineInvitation(id) {
    const result = await apiFetch(`/api/disc-invitations/${id}/decline`, {
      method: 'POST',
      token: authStore.token,
    })
    _myInvites.value = _myInvites.value.filter(i => i.id !== id)
    return result
  }

  /** Loads the people (besides the owner) who currently have access to a disc the signed-in user owns. */
  async function fetchDiscMembers(discId) {
    _discMembersLoading.value = true
    _discMembersError.value = null
    try {
      const members = await apiFetch(`/api/discs/${discId}/people`, { token: authStore.token })
      _discMembers.value = members
    } catch (err) {
      _discMembersError.value = mapAuthError(err, t)
      throw err
    } finally {
      _discMembersLoading.value = false
    }
  }

  /** Revokes a shared person's access to a disc the signed-in user owns. */
  async function removeMember(discId, userId) {
    await apiFetch(`/api/discs/${discId}/people/${userId}`, {
      method: 'DELETE',
      token: authStore.token,
    })
    _discMembers.value = _discMembers.value.filter(m => m.id !== userId)
  }

  return {
    discInvites: readonly(_discInvites),
    discInvitesLoading: readonly(_discInvitesLoading),
    discInvitesError: readonly(_discInvitesError),
    myInvites: readonly(_myInvites),
    myInvitesLoading: readonly(_myInvitesLoading),
    myInvitesError: readonly(_myInvitesError),
    discMembers: readonly(_discMembers),
    discMembersLoading: readonly(_discMembersLoading),
    discMembersError: readonly(_discMembersError),
    fetchDiscInvitations,
    inviteFriend,
    cancelInvitation,
    fetchMyInvitations,
    acceptInvitation,
    declineInvitation,
    fetchDiscMembers,
    removeMember,
  }
}
