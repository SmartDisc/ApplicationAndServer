import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'
import { apiFetch, ApiError } from '@/services/api'
import { isTokenExpired } from '@/utils/jwt'
import { useI18n } from '@/i18n'

// Capacitor Preferences persists per-app-sandbox (Keychain-backed UserDefaults on
// iOS, EncryptedSharedPreferences-eligible SharedPreferences on Android; falls
// back to localStorage on web). It is not a secure enclave, but it is not
// readable by other apps either — the standard place to keep a short-lived
// Bearer token for a Capacitor app. We deliberately never store the password.
const TOKEN_KEY = 'sd_auth_token'

// Codes that don't map to a single user-facing sentence — a generic backend
// `validation_failed` carries per-field messages that are more specific than any
// blanket translation, so we prefer those field messages over the code itself.
const GENERIC_CODES = new Set(['validation_failed'])

// Returns the localized message for an error `code`, or null if `t` has no
// translation for it (t() echoes the key back on a miss).
function localizeCode(code, t) {
  if (!code) return null
  const key = `errors.${code}`
  const msg = t(key)
  return msg === key ? null : msg
}

// Maps an ApiError to a user-facing message. `t` is optional (same convention as
// src/utils/validate.js): with it, messages are localized via the `errors.*`
// namespace keyed off the backend/client `code`; without it, the original
// English strings are returned unchanged (tests and non-Vue callers).
export function mapAuthError(err, t) {
  if (!t) {
    if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.'
    if (err.status === null) return err.message || 'Could not reach the server. Check your connection and try again.'
    if (err.status >= 500) return 'Something went wrong on our end. Please try again shortly.'
    if (err.status === 429) {
      if (err.retryAfter) {
        const mins = Math.ceil(err.retryAfter / 60)
        return `Too many attempts. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`
      }
      return err.message || 'Too many attempts. Please wait a moment and try again.'
    }
    if (err.fieldErrors) return Object.values(err.fieldErrors)[0]
    return err.message || 'Something went wrong. Please try again.'
  }

  if (!(err instanceof ApiError)) return t('errors.generic')
  // No HTTP status: never reached the server (config/timeout/network).
  if (err.status === null) return localizeCode(err.code, t) ?? t('errors.networkError')
  if (err.status >= 500) return t('errors.serverError')
  if (err.status === 429) {
    if (err.retryAfter) {
      const mins = Math.ceil(err.retryAfter / 60)
      return t('errors.rateLimited', { mins })
    }
    return localizeCode(err.code, t) ?? t('errors.rateLimited', { mins: 1 })
  }

  // Specific, app-defined code (e.g. disc_not_found, invalid_disc_credentials).
  const byCode = (err.code && !GENERIC_CODES.has(err.code)) ? localizeCode(err.code, t) : null
  if (byCode) return byCode
  // Per-field messages (validator output without per-field codes) — fall back to
  // the raw message the backend supplied.
  if (err.fieldErrors) return Object.values(err.fieldErrors)[0]
  return localizeCode(err.code, t) ?? err.message ?? t('errors.generic')
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
    isLoading: false,
    error: null,
    initialized: false,
    // Set when an already-signed-in session gets a 401 'unauthenticated'
    // mid-use (see api.js's onUnauthorized + App.vue). Distinct from a
    // failed init() bootstrap, which clears the session silently instead.
    sessionExpired: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
  },

  actions: {
    /** Restore a session from disk on app start. Call once, before the first route resolves. */
    async init() {
      if (this.initialized) return
      this.initialized = true

      const { value: storedToken } = await Preferences.get({ key: TOKEN_KEY })
      if (!storedToken) return

      if (isTokenExpired(storedToken)) {
        await Preferences.remove({ key: TOKEN_KEY })
        return
      }

      this.token = storedToken
      try {
        await this.fetchMe()
      } catch {
        // Token looked valid locally but the server rejected it (revoked, clock
        // skew, tampering) — drop the session rather than limp along unauthenticated.
        await this._clearSession()
      }
    },

    async fetchMe() {
      const me = await apiFetch('/api/me', { token: this.token })
      this.user = me
    },

    async signIn(email, password) {
      this.isLoading = true
      this.error = null
      try {
        const { token } = await apiFetch('/api/login', {
          method: 'POST',
          body: { email, password },
        })
        await this._setSession(token)
      } catch (err) {
        const { t } = useI18n()
        this.error = mapAuthError(err, t)
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async signUp(name, email, password) {
      this.isLoading = true
      this.error = null
      try {
        const { token } = await apiFetch('/api/signup', {
          method: 'POST',
          body: { name, email, password },
        })
        await this._setSession(token)
      } catch (err) {
        const { t } = useI18n()
        this.error = mapAuthError(err, t)
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async signOut() {
      await this._clearSession()
    },

    /** Marks the session dead after a mid-use 401 and drops the stored token. */
    async flagSessionExpired() {
      this.sessionExpired = true
      await this._clearSession()
    },

    /** Called once the user has followed the session-expired popup to sign-in. */
    clearSessionExpired() {
      this.sessionExpired = false
    },

    async changePassword(currentPassword, newPassword) {
      await apiFetch('/api/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
        token: this.token,
      })
    },

    async deleteAccount(currentPassword) {
      await apiFetch('/api/delete-account', {
        method: 'DELETE',
        body: { currentPassword },
        token: this.token,
      })
      await this._clearSession()
    },

    clearError() {
      this.error = null
    },

    async _setSession(token) {
      this.token = token
      await Preferences.set({ key: TOKEN_KEY, value: token })
      try {
        await this.fetchMe()
      } catch (err) {
        await this._clearSession()
        throw err
      }
    },

    async _clearSession() {
      this.token = null
      this.user = null
      await Preferences.remove({ key: TOKEN_KEY })
    },
  },
})
