// @vitest-environment happy-dom
// The auth store now localizes error messages via useI18n(), which pulls in
// usePreferences — that reads localStorage and sets document.lang at module
// load, so this suite needs a DOM environment.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/api', () => {
  class ApiError extends Error {
    constructor(message, { status = null, fieldErrors = null, retryAfter = null } = {}) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.fieldErrors = fieldErrors
      this.retryAfter = retryAfter
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
import { Preferences } from '@capacitor/preferences'
import { useAuthStore } from '../stores/auth.js'

function makeToken(exp) {
  const base64UrlEncode = (obj) =>
    Buffer.from(JSON.stringify(obj), 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  return `${base64UrlEncode({ alg: 'RS256' })}.${base64UrlEncode({ exp })}.sig`
}

const VALID_TOKEN = makeToken(Math.floor(Date.now() / 1000) + 3600)
const EXPIRED_TOKEN = makeToken(Math.floor(Date.now() / 1000) - 60)
const ME = { id: 1, email: 'alex@smartdisc.io', name: 'Alex Rivera' }

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  Preferences.get.mockResolvedValue({ value: null })
})

describe('auth store — session restore (init)', () => {
  it('leaves the session empty when nothing is stored', async () => {
    const store = useAuthStore()
    await store.init()

    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('discards an expired stored token without calling the server', async () => {
    Preferences.get.mockResolvedValue({ value: EXPIRED_TOKEN })
    const store = useAuthStore()

    await store.init()

    expect(store.token).toBeNull()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'sd_auth_token' })
  })

  it('restores the session when the stored token is still valid', async () => {
    Preferences.get.mockResolvedValue({ value: VALID_TOKEN })
    apiFetch.mockResolvedValue(ME)
    const store = useAuthStore()

    await store.init()

    expect(store.token).toBe(VALID_TOKEN)
    expect(store.user).toEqual(ME)
    expect(store.isAuthenticated).toBe(true)
    expect(apiFetch).toHaveBeenCalledWith('/api/me', { token: VALID_TOKEN })
  })

  it('drops the session if the server rejects a locally-valid-looking token', async () => {
    Preferences.get.mockResolvedValue({ value: VALID_TOKEN })
    apiFetch.mockRejectedValue(new ApiError('Expired JWT Token', { status: 401 }))
    const store = useAuthStore()

    await store.init()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'sd_auth_token' })
  })

  it('only restores once even if init() is called multiple times', async () => {
    const store = useAuthStore()
    await store.init()
    await store.init()

    expect(Preferences.get).toHaveBeenCalledTimes(1)
  })
})

describe('auth store — signIn', () => {
  it('authenticates and persists the token on success', async () => {
    apiFetch
      .mockResolvedValueOnce({ token: VALID_TOKEN }) // POST /api/login
      .mockResolvedValueOnce(ME)                      // GET /api/me

    const store = useAuthStore()
    await store.signIn('alex@smartdisc.io', 'Correct1!')

    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toEqual(ME)
    expect(store.error).toBeNull()
    expect(Preferences.set).toHaveBeenCalledWith({ key: 'sd_auth_token', value: VALID_TOKEN })
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/login', {
      method: 'POST',
      body: { email: 'alex@smartdisc.io', password: 'Correct1!' },
    })
  })

  it('surfaces the server message and stays unauthenticated on bad credentials', async () => {
    apiFetch.mockRejectedValue(new ApiError('Invalid credentials.', { status: 401 }))
    const store = useAuthStore()

    await expect(store.signIn('alex@smartdisc.io', 'wrong')).rejects.toThrow()

    expect(store.isAuthenticated).toBe(false)
    expect(store.error).toBe('Invalid credentials.')
    expect(store.isLoading).toBe(false)
    expect(Preferences.set).not.toHaveBeenCalled()
  })

  it('maps a rate-limited login into a friendly retry message', async () => {
    apiFetch.mockRejectedValue(
      new ApiError('Too many failed login attempts.', { status: 429, retryAfter: 120 }),
    )
    const store = useAuthStore()

    await expect(store.signIn('a@b.com', 'x')).rejects.toThrow()

    expect(store.error).toBe('Too many attempts. Please try again in 2 minutes.')
  })

  it('maps a network failure into a connectivity message', async () => {
    apiFetch.mockRejectedValue(new ApiError('Could not reach the server. Check your connection and try again.', { status: null }))
    const store = useAuthStore()

    await expect(store.signIn('a@b.com', 'x')).rejects.toThrow()

    expect(store.error).toMatch(/could not reach the server/i)
  })

  it('clears the session if login succeeds but the follow-up /me call fails', async () => {
    apiFetch
      .mockResolvedValueOnce({ token: VALID_TOKEN })
      .mockRejectedValueOnce(new ApiError('Server error', { status: 500 }))

    const store = useAuthStore()
    await expect(store.signIn('a@b.com', 'x')).rejects.toThrow()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'sd_auth_token' })
  })

  it('sets isLoading true while the request is in flight', async () => {
    let resolveLogin
    apiFetch.mockReturnValueOnce(new Promise((resolve) => { resolveLogin = resolve }))
    const store = useAuthStore()

    const promise = store.signIn('a@b.com', 'x')
    expect(store.isLoading).toBe(true)

    resolveLogin({ token: VALID_TOKEN })
    apiFetch.mockResolvedValueOnce(ME)
    await promise

    expect(store.isLoading).toBe(false)
  })
})

describe('auth store — signUp', () => {
  it('registers, authenticates, and persists the token on success', async () => {
    apiFetch
      .mockResolvedValueOnce({ token: VALID_TOKEN }) // POST /api/signup
      .mockResolvedValueOnce(ME)                      // GET /api/me

    const store = useAuthStore()
    await store.signUp('Alex Rivera', 'alex@smartdisc.io', 'Correct1!')

    expect(store.isAuthenticated).toBe(true)
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/signup', {
      method: 'POST',
      body: { name: 'Alex Rivera', email: 'alex@smartdisc.io', password: 'Correct1!' },
    })
  })

  it('surfaces a field-level error on 409 email conflict', async () => {
    apiFetch.mockRejectedValue(
      new ApiError('Conflict', {
        status: 409,
        fieldErrors: { email: 'An account with this email already exists.' },
      }),
    )
    const store = useAuthStore()

    await expect(store.signUp('Alex', 'taken@smartdisc.io', 'Correct1!')).rejects.toThrow()

    expect(store.error).toBe('An account with this email already exists.')
  })

  it('surfaces a field-level error on 422 validation failure', async () => {
    apiFetch.mockRejectedValue(
      new ApiError('Unprocessable', {
        status: 422,
        fieldErrors: { password: 'Password is too weak.' },
      }),
    )
    const store = useAuthStore()

    await expect(store.signUp('Alex', 'a@b.com', 'weak')).rejects.toThrow()

    expect(store.error).toBe('Password is too weak.')
  })

  it('never sends the password as part of any persisted state', async () => {
    apiFetch
      .mockResolvedValueOnce({ token: VALID_TOKEN })
      .mockResolvedValueOnce(ME)
    const store = useAuthStore()

    await store.signUp('Alex Rivera', 'alex@smartdisc.io', 'Correct1!')

    for (const call of Preferences.set.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('Correct1!')
    }
    expect(store).not.toHaveProperty('password')
  })
})

describe('auth store — signOut', () => {
  it('clears in-memory state and removes the persisted token', async () => {
    apiFetch
      .mockResolvedValueOnce({ token: VALID_TOKEN })
      .mockResolvedValueOnce(ME)
    const store = useAuthStore()
    await store.signIn('a@b.com', 'Correct1!')
    expect(store.isAuthenticated).toBe(true)

    await store.signOut()

    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'sd_auth_token' })
  })
})

describe('auth store — deleteAccount', () => {
  it('calls the delete-account endpoint and clears the session on success', async () => {
    apiFetch
      .mockResolvedValueOnce({ token: VALID_TOKEN }) // POST /api/login
      .mockResolvedValueOnce(ME)                      // GET /api/me
      .mockResolvedValueOnce({ message: 'Account deleted successfully.' }) // DELETE /api/delete-account

    const store = useAuthStore()
    await store.signIn('a@b.com', 'Correct1!')
    expect(store.isAuthenticated).toBe(true)

    await store.deleteAccount('Correct1!')

    expect(apiFetch).toHaveBeenNthCalledWith(3, '/api/delete-account', {
      method: 'DELETE',
      body: { currentPassword: 'Correct1!' },
      token: VALID_TOKEN,
    })
    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'sd_auth_token' })
  })

  it('does not clear the session if the server rejects the request', async () => {
    apiFetch
      .mockResolvedValueOnce({ token: VALID_TOKEN })
      .mockResolvedValueOnce(ME)
      .mockRejectedValueOnce(new ApiError('Current password is incorrect.', {
        status: 422,
        fieldErrors: { currentPassword: 'Current password is incorrect.' },
      }))

    const store = useAuthStore()
    await store.signIn('a@b.com', 'Correct1!')

    await expect(store.deleteAccount('wrong')).rejects.toThrow()

    expect(store.isAuthenticated).toBe(true)
    expect(store.token).toBe(VALID_TOKEN)
    expect(Preferences.remove).not.toHaveBeenCalled()
  })
})

describe('auth store — clearError', () => {
  it('resets the error state', async () => {
    apiFetch.mockRejectedValue(new ApiError('Invalid credentials.', { status: 401 }))
    const store = useAuthStore()
    await expect(store.signIn('a@b.com', 'x')).rejects.toThrow()
    expect(store.error).not.toBeNull()

    store.clearError()

    expect(store.error).toBeNull()
  })
})
