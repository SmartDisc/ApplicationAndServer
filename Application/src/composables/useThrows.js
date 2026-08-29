import { ref, readonly } from 'vue'
import { apiFetch } from '@/services/api'
import { useAuthStore, mapAuthError } from '@/stores/auth'
import { useI18n } from '@/i18n'

// Throws are scoped per-disc, so the local cache is keyed by discId rather
// than being a flat list the way useDiscs.js keeps `_discs` — otherwise this
// mirrors that module-singleton pattern exactly: module-level refs outside
// the exported function, readonly() wrapping on what's returned, and a
// private mapX(raw) that converts the server shape into the frontend shape.
const _throwsByDisc = ref(new Map())
const _throwsLoading = ref(false)
const _throwsError = ref(null)

// Same day-key vocabulary as useDiscs.js's formatThrowTime()/formatLastActive()
// (see src/i18n/translations.js's discs.days.* namespace: today/yesterday/
// weekday abbreviations like `sat`) — t('discs.days.' + day) resolves these.
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function dayKeyFor(recordedAt) {
  const date = new Date(recordedAt)
  const now = new Date()
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)

  if (dayDiff === 0) return 'today'
  if (dayDiff === 1) return 'yesterday'
  return WEEKDAY_KEYS[date.getDay()]
}

function clockFor(recordedAt) {
  const date = new Date(recordedAt)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function mapThrow(raw) {
  return {
    id: raw.id,
    name: raw.name,
    auto: raw.isAutoNamed,
    fav: raw.isFavorite,
    rpm: raw.maxRpm != null ? Math.round(raw.maxRpm) : null,
    day: dayKeyFor(raw.recordedAt),
    clock: clockFor(raw.recordedAt),
    recordedAt: raw.recordedAt,
    durationMs: raw.durationMs,
    maxAltM: raw.maxAltM,
    maxAccelMagnitude: raw.maxAccelMagnitude,
    avgTempC: raw.avgTempC,
    recordedByName: raw.recordedByName,
    series: raw.series ?? null,
  }
}

/** '{day} · {clock}' — day label follows the current language; no speed segment
 * (replaces useDiscs.js's old formatThrowTime(), which baked in a speedKmh
 * field the new throw shape doesn't have). */
export function formatThrowTime(t, throw_) {
  const day = t(`discs.days.${throw_.day}`)
  return `${day} · ${throw_.clock}`
}

export function useThrows() {
  const authStore = useAuthStore()
  const { t } = useI18n()

  function getThrows(discId) {
    return _throwsByDisc.value.get(discId) ?? []
  }

  function setThrowsForDisc(discId, throws) {
    const next = new Map(_throwsByDisc.value)
    next.set(discId, throws)
    _throwsByDisc.value = next
  }

  /** Loads a disc's throws from the backend, newest first, into the local cache. */
  async function fetchThrows(discId) {
    _throwsLoading.value = true
    _throwsError.value = null
    try {
      const throws = await apiFetch(`/api/discs/${discId}/throws`, { token: authStore.token })
      setThrowsForDisc(discId, throws.map(mapThrow))
    } catch (err) {
      _throwsError.value = mapAuthError(err, t)
      throw err
    } finally {
      _throwsLoading.value = false
    }
  }

  /** Saves a newly-recorded throw's summary to the backend and prepends it locally. */
  async function saveThrow(discId, summary, { name } = {}) {
    const body = { ...summary, series: summary.series, ...(name !== undefined ? { name } : {}) }
    const created = await apiFetch(`/api/discs/${discId}/throws`, {
      method: 'POST',
      body,
      token: authStore.token,
    })
    const mapped = mapThrow(created)
    setThrowsForDisc(discId, [mapped, ...getThrows(discId)])
    return mapped
  }

  /** Renames a throw on the backend and reflects it in the local cache. */
  async function renameThrow(discId, throwId, name) {
    const updated = await apiFetch(`/api/discs/${discId}/throws/${throwId}`, {
      method: 'PATCH',
      body: { name },
      token: authStore.token,
    })
    const mapped = mapThrow(updated)
    setThrowsForDisc(discId, getThrows(discId).map(th => (th.id === throwId ? mapped : th)))
    return mapped
  }

  /** Toggles a throw's favorite flag on the backend and reflects it in the local cache. */
  async function toggleThrowFavorite(discId, throwId, favorite) {
    const updated = await apiFetch(`/api/discs/${discId}/throws/${throwId}`, {
      method: 'PATCH',
      body: { favorite },
      token: authStore.token,
    })
    const mapped = mapThrow(updated)
    setThrowsForDisc(discId, getThrows(discId).map(th => (th.id === throwId ? mapped : th)))
    return mapped
  }

  /** Deletes a throw on the backend and removes it from the local cache. */
  async function deleteThrow(discId, throwId) {
    await apiFetch(`/api/discs/${discId}/throws/${throwId}`, { method: 'DELETE', token: authStore.token })
    setThrowsForDisc(discId, getThrows(discId).filter(th => th.id !== throwId))
  }

  return {
    throwsLoading: readonly(_throwsLoading),
    throwsError: readonly(_throwsError),
    getThrows,
    fetchThrows,
    saveThrow,
    renameThrow,
    toggleThrowFavorite,
    deleteThrow,
  }
}
