import { ref, readonly } from 'vue'
import { apiFetch } from '@/services/api'
import { useAuthStore, mapAuthError } from '@/stores/auth'
import { useI18n } from '@/i18n'
import { downscaleImage } from '@/utils/image'

// Photo uploads run over mobile data far more often than the JSON calls do,
// so they get a longer leash than apiFetch's default 15s.
const UPLOAD_TIMEOUT_MS = 60000

// Throw `time` is stored as a day key + clock time rather than a baked-in
// formatted string, so views can translate the day label at render time.
// See formatThrowTime() in useThrows.js / formatLastActive() below.
//
// Owned discs are paired by a real disc's UUID + password (see AddDiscView)
// and fetched from the backend — there's no throw-logging feature yet, so
// throws/longest/fav/lastActive stay at their empty defaults until that
// lands; only id/name/uuid/players reflect real data.
const _discs = ref([])
const _discsLoading = ref(false)
const _discsError = ref(null)

function mapDisc(disc) {
  return {
    id: disc.id,
    name: disc.name,
    uuid: disc.id,
    throws: 0,
    longest: 0,
    players: 1 + (disc.sharedCount ?? 0),
    fav: false,
    lastActive: null,
    throws_list: [],
    hasImage: disc.hasImage ?? false,
    imageUrl: disc.imageUrl ?? null,
  }
}

// Shared discs are ones someone else owns and shared with you — fetched from
// the backend the same way owned discs are; empty until sharing is set up.
const _sharedDiscs = ref([])
const _sharedDiscsLoading = ref(false)
const _sharedDiscsError = ref(null)

function mapSharedDisc(disc) {
  return {
    id: disc.id,
    name: disc.name,
    uuid: disc.id,
    owner: disc.ownerName || disc.ownerEmail || '',
    // sharedDisc() flattens the owner inline, so their avatar fields are
    // prefixed rather than the plain hasAvatar/avatarUrl used elsewhere.
    ownerHasAvatar: disc.ownerHasAvatar ?? false,
    ownerAvatarUrl: disc.ownerAvatarUrl ?? null,
    throws: 0,
    longest: 0,
    topRpm: 0,
    players: 1 + (disc.sharedCount ?? 0),
    throws_list: [],
    hasImage: disc.hasImage ?? false,
    imageUrl: disc.imageUrl ?? null,
  }
}

/** Renders a disc's `lastActive` descriptor using the current language. */
export function formatLastActive(t, lastActive) {
  if (!lastActive) return ''
  switch (lastActive.kind) {
    case 'activeMinAgo': return t('discs.lastActive.activeMinAgo', { min: lastActive.min })
    case 'yesterdayAt':  return t('discs.lastActive.yesterdayAt', { time: lastActive.clock })
    case 'daysAgo':      return t('discs.lastActive.daysAgo', { days: lastActive.days })
    default:              return ''
  }
}

export function useDiscs() {
  const authStore = useAuthStore()
  const { t } = useI18n()

  function getDisc(id) {
    return _discs.value.find(d => d.id === id) ?? null
  }
  function getSharedDisc(id) {
    return _sharedDiscs.value.find(d => d.id === id) ?? null
  }

  /** Loads the discs the signed-in user owns from the backend. */
  async function fetchDiscs() {
    _discsLoading.value = true
    _discsError.value = null
    try {
      const discs = await apiFetch('/api/discs', { token: authStore.token })
      _discs.value = discs.map(mapDisc)
    } catch (err) {
      _discsError.value = mapAuthError(err, t)
      throw err
    } finally {
      _discsLoading.value = false
    }
  }

  /** Pairs a disc by its UUID + password and adds it to the owned list. */
  async function claimDisc(id, password) {
    const disc = await apiFetch('/api/discs/claim', {
      method: 'POST',
      body: { id, password },
      token: authStore.token,
    })
    _discs.value = [mapDisc(disc), ..._discs.value]
    return disc
  }

  /** Renames an owned disc on the backend and reflects it in the local list. */
  async function renameDisc(id, name) {
    const updated = await apiFetch(`/api/discs/${id}`, {
      method: 'PATCH',
      body: { name },
      token: authStore.token,
    })
    _discs.value = _discs.value.map(d => (d.id === id ? { ...d, name: updated.name } : d))
    return updated
  }

  /**
   * Uploads a photo for an owned disc, replacing any existing one. The file is
   * downscaled first — see utils/image.js; the server re-encodes regardless.
   * The returned imageUrl carries a `?v=` cache-buster, so simply storing it
   * is what makes a replaced photo appear straight away.
   */
  async function uploadDiscImage(id, file) {
    const optimized = await downscaleImage(file)
    const form = new FormData()
    form.append('image', optimized, optimized.name || 'disc-image.jpg')
    const result = await apiFetch(`/api/discs/${id}/image`, {
      method: 'POST',
      body: form,
      token: authStore.token,
      timeout: UPLOAD_TIMEOUT_MS,
    })
    _discs.value = _discs.value.map(d => (
      d.id === id ? { ...d, hasImage: result.hasImage ?? true, imageUrl: result.imageUrl ?? null } : d
    ))
    return result
  }

  /** Removes an owned disc's photo on the backend and in the local list. */
  async function deleteDiscImage(id) {
    await apiFetch(`/api/discs/${id}/image`, {
      method: 'DELETE',
      token: authStore.token,
    })
    _discs.value = _discs.value.map(d => (
      d.id === id ? { ...d, hasImage: false, imageUrl: null } : d
    ))
  }

  /** Loads the discs that were shared with the signed-in user. */
  async function fetchSharedDiscs() {
    _sharedDiscsLoading.value = true
    _sharedDiscsError.value = null
    try {
      const discs = await apiFetch('/api/discs/shared', { token: authStore.token })
      _sharedDiscs.value = discs.map(mapSharedDisc)
    } catch (err) {
      _sharedDiscsError.value = mapAuthError(err, t)
      throw err
    } finally {
      _sharedDiscsLoading.value = false
    }
  }

  return {
    discs: readonly(_discs),
    discsLoading: readonly(_discsLoading),
    discsError: readonly(_discsError),
    sharedDiscs: readonly(_sharedDiscs),
    sharedDiscsLoading: readonly(_sharedDiscsLoading),
    sharedDiscsError: readonly(_sharedDiscsError),
    getDisc,
    getSharedDisc,
    fetchDiscs,
    claimDisc,
    renameDisc,
    uploadDiscImage,
    deleteDiscImage,
    fetchSharedDiscs,
  }
}
