import { ref, readonly } from 'vue'
import { apiFetch } from '@/services/api'
import { useAuthStore, mapAuthError } from '@/stores/auth'
import { useI18n } from '@/i18n'

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
    throws: 0,
    longest: 0,
    topRpm: 0,
    players: 1 + (disc.sharedCount ?? 0),
    throws_list: [],
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
    fetchSharedDiscs,
  }
}
