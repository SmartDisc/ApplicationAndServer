import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch, ApiError } from '../services/api.js'

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  const headerMap = new Map(Object.entries({ 'content-type': 'application/json', ...headers }))
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key) => headerMap.get(key.toLowerCase()) ?? null },
    json: async () => body,
  }
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('performs a GET request and returns the parsed JSON body', async () => {
    fetch.mockResolvedValue(jsonResponse({ id: 1, email: 'a@b.com', name: 'Alex' }))

    const data = await apiFetch('/api/me', { token: 'tok123' })

    expect(data).toEqual({ id: 1, email: 'a@b.com', name: 'Alex' })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toMatch(/\/api\/me$/)
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('omit')
    expect(init.headers.Authorization).toBe('Bearer tok123')
  })

  it('does not send an Authorization header when no token is given', async () => {
    fetch.mockResolvedValue(jsonResponse({ token: 'xyz' }))

    await apiFetch('/api/login', { method: 'POST', body: { email: 'a@b.com', password: 'secret' } })

    const [, init] = fetch.mock.calls[0]
    expect(init.headers.Authorization).toBeUndefined()
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'secret' })
  })

  it('throws an ApiError using the "message" field (lexik login failure shape)', async () => {
    fetch.mockResolvedValue(jsonResponse({ code: 401, message: 'Invalid credentials.' }, { status: 401 }))

    await expect(apiFetch('/api/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Invalid credentials.',
    })
  })

  it('throws an ApiError using the "error" field (custom controller shape)', async () => {
    fetch.mockResolvedValue(jsonResponse({ error: 'Request body must be valid JSON.' }, { status: 400 }))

    await expect(apiFetch('/api/signup', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 400,
      message: 'Request body must be valid JSON.',
    })
  })

  it('exposes fieldErrors and derives the message from them (422 validation)', async () => {
    fetch.mockResolvedValue(
      jsonResponse({ errors: { password: 'Password is too weak.' } }, { status: 422 }),
    )

    try {
      await apiFetch('/api/signup', { method: 'POST', body: {} })
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBe(422)
      expect(err.fieldErrors).toEqual({ password: 'Password is too weak.' })
      expect(err.message).toBe('Password is too weak.')
    }
  })

  it('parses the Retry-After header into retryAfter (429 rate limit)', async () => {
    fetch.mockResolvedValue(
      jsonResponse(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'retry-after': '900' } },
      ),
    )

    try {
      await apiFetch('/api/signup', { method: 'POST', body: {} })
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err.status).toBe(429)
      expect(err.retryAfter).toBe(900)
    }
  })

  it('wraps a network failure as an ApiError with status null', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'))

    try {
      await apiFetch('/api/me', { token: 't' })
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBeNull()
      expect(err.message).toMatch(/could not reach the server/i)
    }
  })

  it('wraps an aborted/timed-out request with a distinct message', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    fetch.mockRejectedValue(abortError)

    try {
      await apiFetch('/api/me', { token: 't' })
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err.status).toBeNull()
      expect(err.message).toMatch(/timed out/i)
    }
  })

  it('sends a FormData body untouched and without a Content-Type header', async () => {
    fetch.mockResolvedValue(jsonResponse({ hasAvatar: true, avatarUrl: '/api/users/1/avatar?v=42' }))

    const form = new FormData()
    form.append('image', new Blob(['bytes'], { type: 'image/webp' }), 'avatar.webp')

    await apiFetch('/api/me/avatar', { method: 'POST', body: form, token: 'tok123' })

    const [, init] = fetch.mock.calls[0]
    // The boundary only exists on the FormData instance the browser is handed,
    // so a serialized body or a hand-written Content-Type would break the upload.
    expect(init.body).toBe(form)
    expect(init.headers['Content-Type']).toBeUndefined()
    expect(init.headers.Authorization).toBe('Bearer tok123')
  })

  it('returns null data for a non-JSON (e.g. empty 204) response without throwing', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: () => null },
      json: async () => { throw new Error('no body') },
    })

    await expect(apiFetch('/api/logout', { method: 'POST' })).resolves.toBeNull()
  })
})
