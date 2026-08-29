import { ref, readonly } from 'vue'
import { apiFetch } from '@/services/api'
import { useAuthStore, mapAuthError } from '@/stores/auth'
import { useI18n } from '@/i18n'

// Accepted friends: [{ friendshipId, id, name, email }]
const _friends = ref([])
const _friendsLoading = ref(false)
const _friendsError = ref(null)

// Incoming pending requests: [{ id, fromUserId, fromName, fromEmail, createdAt }]
const _requests = ref([])
const _requestsLoading = ref(false)
const _requestsError = ref(null)

// Outgoing pending requests: [{ id, toUserId, toName, toEmail, createdAt }]
const _sentRequests = ref([])
const _sentRequestsLoading = ref(false)
const _sentRequestsError = ref(null)

// Live "add friend" search results: [{ id, name, email }]
const _searchResults = ref([])
const _searchLoading = ref(false)
const _searchError = ref(null)

let _searchTimer = null
let _searchSeq = 0

export function useFriends() {
  const authStore = useAuthStore()
  const { t } = useI18n()

  /** Loads the signed-in user's accepted friends. */
  async function fetchFriends() {
    _friendsLoading.value = true
    _friendsError.value = null
    try {
      const friends = await apiFetch('/api/friends', { token: authStore.token })
      _friends.value = friends
    } catch (err) {
      _friendsError.value = mapAuthError(err, t)
      throw err
    } finally {
      _friendsLoading.value = false
    }
  }

  /** Loads pending friend requests addressed to the signed-in user. */
  async function fetchRequests() {
    _requestsLoading.value = true
    _requestsError.value = null
    try {
      const requests = await apiFetch('/api/friends/requests', { token: authStore.token })
      _requests.value = requests
    } catch (err) {
      _requestsError.value = mapAuthError(err, t)
      throw err
    } finally {
      _requestsLoading.value = false
    }
  }

  /** Loads pending friend requests sent by the signed-in user, awaiting a response. */
  async function fetchSentRequests() {
    _sentRequestsLoading.value = true
    _sentRequestsError.value = null
    try {
      const sentRequests = await apiFetch('/api/friends/requests/sent', { token: authStore.token })
      _sentRequests.value = sentRequests
    } catch (err) {
      _sentRequestsError.value = mapAuthError(err, t)
      throw err
    } finally {
      _sentRequestsLoading.value = false
    }
  }

  /**
   * Debounced (300ms) search by name/email for the "add friend" flow.
   * Stale responses (superseded by a newer keystroke) are discarded.
   */
  function searchUsers(query) {
    if (_searchTimer) clearTimeout(_searchTimer)
    const q = query.trim()
    const seq = ++_searchSeq
    if (!q) {
      _searchResults.value = []
      _searchLoading.value = false
      _searchError.value = null
      return
    }
    _searchLoading.value = true
    _searchError.value = null
    _searchTimer = setTimeout(async () => {
      try {
        const results = await apiFetch(`/api/friends/search?q=${encodeURIComponent(q)}`, { token: authStore.token })
        if (seq === _searchSeq) _searchResults.value = results
      } catch (err) {
        if (seq === _searchSeq) _searchError.value = mapAuthError(err, t)
      } finally {
        if (seq === _searchSeq) _searchLoading.value = false
      }
    }, 300)
  }

  /** Clears any pending/settled search state (e.g. after a request is sent). */
  function clearSearch() {
    if (_searchTimer) clearTimeout(_searchTimer)
    _searchSeq++
    _searchResults.value = []
    _searchLoading.value = false
    _searchError.value = null
  }

  /** Sends a friend request by email. Throws ApiError (404/409/422) on failure. */
  async function sendRequest(email) {
    return apiFetch('/api/friends/requests', {
      method: 'POST',
      body: { email },
      token: authStore.token,
    })
  }

  /** Accepts an incoming friend request and refreshes the friends list. */
  async function acceptRequest(id) {
    const result = await apiFetch(`/api/friends/requests/${id}/accept`, {
      method: 'POST',
      token: authStore.token,
    })
    _requests.value = _requests.value.filter(r => r.id !== id)
    await fetchFriends()
    return result
  }

  /** Declines an incoming friend request. */
  async function declineRequest(id) {
    const result = await apiFetch(`/api/friends/requests/${id}/decline`, {
      method: 'POST',
      token: authStore.token,
    })
    _requests.value = _requests.value.filter(r => r.id !== id)
    return result
  }

  /** Removes an accepted friendship. */
  async function removeFriend(friendshipId) {
    await apiFetch(`/api/friends/${friendshipId}`, {
      method: 'DELETE',
      token: authStore.token,
    })
    _friends.value = _friends.value.filter(f => f.friendshipId !== friendshipId)
  }

  return {
    friends: readonly(_friends),
    friendsLoading: readonly(_friendsLoading),
    friendsError: readonly(_friendsError),
    requests: readonly(_requests),
    requestsLoading: readonly(_requestsLoading),
    requestsError: readonly(_requestsError),
    sentRequests: readonly(_sentRequests),
    sentRequestsLoading: readonly(_sentRequestsLoading),
    sentRequestsError: readonly(_sentRequestsError),
    searchResults: readonly(_searchResults),
    searchLoading: readonly(_searchLoading),
    searchError: readonly(_searchError),
    fetchFriends,
    fetchRequests,
    fetchSentRequests,
    searchUsers,
    clearSearch,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
  }
}
