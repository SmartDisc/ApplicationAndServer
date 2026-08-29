/**
 * Thin fetch wrapper for the SmartDisc API.
 *
 * - Resolves the base URL from VITE_API_BASE_URL (required in production
 *   builds since a Capacitor app's own origin — capacitor://localhost /
 *   https://localhost — is never the API's origin).
 * - Sends `credentials: 'omit'`: auth is a Bearer token, never a cookie, so
 *   there is no session cookie to leak cross-origin and no CSRF surface.
 * - Normalises every non-2xx response into an ApiError so callers can branch
 *   on `status` / `fieldErrors` instead of re-parsing bodies.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TIMEOUT_MS = 15000

// Fired whenever a request comes back 401 with code 'unauthenticated' (an
// expired/invalid token, as opposed to e.g. 'invalid_credentials' on a login
// attempt). Callers across ~6 composables/stores all go through apiFetch, so
// this is the one place that can notice a session died mid-use and let the
// app react (see App.vue, which shows the session-expired popup).
let unauthorizedHandler = null
export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  constructor(message, { status = null, fieldErrors = null, retryAfter = null, code = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.retryAfter = retryAfter
    // Stable machine-readable token (snake_case) a caller with a `t` function can
    // localize. Comes from the backend's `code` field, or is set client-side for
    // failures that never reach the server (config/timeout/network).
    this.code = code
  }
}

export async function apiFetch(path, { method = 'GET', body, token, signal } = {}) {
  if (!BASE_URL) {
    throw new ApiError(
      'API base URL is not configured. Set VITE_API_BASE_URL at build time.',
      { status: null, code: 'config_missing' },
    )
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const onExternalAbort = () => controller.abort()
  if (signal) signal.addEventListener('abort', onExternalAbort)

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'omit',
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', { status: null, code: 'timeout' })
    }
    throw new ApiError('Could not reach the server. Check your connection and try again.', { status: null, code: 'network_error' })
  } finally {
    clearTimeout(timeoutId)
    if (signal) signal.removeEventListener('abort', onExternalAbort)
  }

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null

  if (!response.ok) {
    const retryAfterHeader = response.headers.get('Retry-After')
    const message =
      data?.message
      ?? data?.error
      ?? (data?.errors && Object.values(data.errors)[0])
      ?? `Request failed (${response.status}).`

    if (response.status === 401 && data?.code === 'unauthenticated') {
      unauthorizedHandler?.()
    }

    throw new ApiError(message, {
      status: response.status,
      fieldErrors: data?.errors ?? null,
      retryAfter: retryAfterHeader ? Number(retryAfterHeader) : null,
      code: data?.code ?? null,
    })
  }

  return data
}
