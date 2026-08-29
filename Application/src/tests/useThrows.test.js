// @vitest-environment happy-dom
// useThrows() pulls in useAuthStore() (needs an active Pinia) and useI18n()
// via mapAuthError(err, t) -> usePreferences(), which reads localStorage and
// sets document.lang at module load — same reasons auth.store.test.js needs
// a DOM environment.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/api', () => {
  class ApiError extends Error {
    constructor(message, { status = null, fieldErrors = null, retryAfter = null, code = null } = {}) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.fieldErrors = fieldErrors
      this.retryAfter = retryAfter
      this.code = code
    }
  }
  return { apiFetch: vi.fn(), ApiError }
})

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: null })),
    set: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
  },
}))

import { apiFetch, ApiError } from '@/services/api'
import { useThrows, formatThrowTime } from '../composables/useThrows.js'

const DISC_ID = 'disc-1'

function rawThrow(overrides = {}) {
  return {
    id: 'throw-1',
    discId: DISC_ID,
    name: 'Throw 1',
    isAutoNamed: true,
    recordedAt: '2026-07-18T10:30:00.000Z',
    durationMs: 1500,
    maxRpm: 812.6,
    maxAltM: 12.3,
    maxAccelMagnitude: 4.2,
    avgTempC: 21.5,
    sampleCount: 300,
    isFavorite: false,
    recordedById: 'user-1',
    recordedByName: 'Alex Rivera',
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useThrows — fetchThrows / getThrows', () => {
  it('populates the local cache for that disc id', async () => {
    const raw = [rawThrow({ id: 't1' }), rawThrow({ id: 't2' })]
    apiFetch.mockResolvedValue(raw)
    const { fetchThrows, getThrows, throwsLoading, throwsError } = useThrows()

    expect(getThrows(DISC_ID)).toEqual([])

    await fetchThrows(DISC_ID)

    expect(apiFetch).toHaveBeenCalledWith(`/api/discs/${DISC_ID}/throws`, { token: null })
    const throws = getThrows(DISC_ID)
    expect(throws).toHaveLength(2)
    expect(throws[0]).toMatchObject({
      id: 't1',
      name: 'Throw 1',
      auto: true,
      fav: false,
      rpm: 813,
      recordedAt: raw[0].recordedAt,
      durationMs: 1500,
      maxAltM: 12.3,
      maxAccelMagnitude: 4.2,
      avgTempC: 21.5,
      recordedByName: 'Alex Rivera',
    })
    expect(throws[0].day).toBeTruthy()
    expect(throws[0].clock).toMatch(/^\d{2}:\d{2}$/)
    expect(throwsLoading.value).toBe(false)
    expect(throwsError.value).toBeNull()
  })

  it('returns [] for a disc that has not been fetched yet', () => {
    const { getThrows } = useThrows()
    expect(getThrows('never-fetched')).toEqual([])
  })

  it('sets throwsError via mapAuthError and rethrows on a failed fetch', async () => {
    apiFetch.mockRejectedValue(new ApiError('Server error', { status: 500 }))
    const { fetchThrows, throwsError } = useThrows()

    await expect(fetchThrows(DISC_ID)).rejects.toThrow('Server error')

    expect(throwsError.value).toBeTruthy()
  })
})

describe('useThrows — saveThrow', () => {
  it('POSTs the summary spread with name, and prepends the mapped result', async () => {
    const existing = rawThrow({ id: 'existing' })
    apiFetch.mockResolvedValueOnce([existing])
    const { fetchThrows, saveThrow, getThrows } = useThrows()
    await fetchThrows(DISC_ID)

    const created = rawThrow({ id: 'new-throw', name: 'My Ace' })
    apiFetch.mockResolvedValueOnce(created)

    const summary = {
      recordedAt: '2026-07-18T11:00:00.000Z',
      durationMs: 2000,
      maxRpm: 900,
      maxAltM: 20,
      maxAccelMagnitude: 5,
      avgTempC: 22,
      sampleCount: 400,
    }
    const result = await saveThrow(DISC_ID, summary, { name: 'My Ace' })

    expect(apiFetch).toHaveBeenCalledWith(`/api/discs/${DISC_ID}/throws`, {
      method: 'POST',
      body: { ...summary, name: 'My Ace' },
      token: null,
    })
    expect(result.id).toBe('new-throw')
    const throws = getThrows(DISC_ID)
    expect(throws).toHaveLength(2)
    expect(throws[0].id).toBe('new-throw')
    expect(throws[1].id).toBe('existing')
  })

  it('omits name from the body when not given', async () => {
    apiFetch.mockResolvedValue(rawThrow())
    const { saveThrow } = useThrows()

    const summary = { recordedAt: '2026-07-18T11:00:00.000Z', durationMs: 2000 }
    await saveThrow(DISC_ID, summary)

    expect(apiFetch).toHaveBeenCalledWith(`/api/discs/${DISC_ID}/throws`, {
      method: 'POST',
      body: summary,
      token: null,
    })
  })
})

describe('useThrows — renameThrow / toggleThrowFavorite', () => {
  it('renameThrow PATCHes {name} and updates the cached entry in place', async () => {
    const raw = rawThrow({ id: 't1', name: 'Old name' })
    apiFetch.mockResolvedValueOnce([raw])
    const { fetchThrows, renameThrow, getThrows } = useThrows()
    await fetchThrows(DISC_ID)

    const updated = rawThrow({ id: 't1', name: 'New name' })
    apiFetch.mockResolvedValueOnce(updated)

    await renameThrow(DISC_ID, 't1', 'New name')

    expect(apiFetch).toHaveBeenCalledWith(`/api/discs/${DISC_ID}/throws/t1`, {
      method: 'PATCH',
      body: { name: 'New name' },
      token: null,
    })
    expect(getThrows(DISC_ID)[0].name).toBe('New name')
  })

  it('toggleThrowFavorite PATCHes {favorite} and updates the cached entry in place', async () => {
    const raw = rawThrow({ id: 't1', isFavorite: false })
    apiFetch.mockResolvedValueOnce([raw])
    const { fetchThrows, toggleThrowFavorite, getThrows } = useThrows()
    await fetchThrows(DISC_ID)

    const updated = rawThrow({ id: 't1', isFavorite: true })
    apiFetch.mockResolvedValueOnce(updated)

    await toggleThrowFavorite(DISC_ID, 't1', true)

    expect(apiFetch).toHaveBeenCalledWith(`/api/discs/${DISC_ID}/throws/t1`, {
      method: 'PATCH',
      body: { favorite: true },
      token: null,
    })
    expect(getThrows(DISC_ID)[0].fav).toBe(true)
  })
})

describe('formatThrowTime', () => {
  it("renders '{day} · {clock}' using t('discs.days.<day>')", () => {
    const t = (key) => (key === 'discs.days.today' ? 'Today' : key)
    const result = formatThrowTime(t, { day: 'today', clock: '10:30' })
    expect(result).toBe('Today · 10:30')
  })
})
