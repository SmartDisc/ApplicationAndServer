import { describe, it, expect } from 'vitest'
import { decodeJwtPayload, isTokenExpired } from '../utils/jwt.js'

function makeToken(payload) {
  const base64UrlEncode = (obj) =>
    Buffer.from(JSON.stringify(obj), 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  const header = base64UrlEncode({ alg: 'RS256', typ: 'JWT' })
  const body = base64UrlEncode(payload)
  return `${header}.${body}.fake-signature`
}

describe('decodeJwtPayload', () => {
  it('returns null for a non-string input', () => {
    expect(decodeJwtPayload(null)).toBeNull()
    expect(decodeJwtPayload(undefined)).toBeNull()
    expect(decodeJwtPayload(42)).toBeNull()
  })

  it('returns null for a malformed token (wrong segment count)', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull()
    expect(decodeJwtPayload('a.b')).toBeNull()
    expect(decodeJwtPayload('a.b.c.d')).toBeNull()
  })

  it('returns null when the payload segment is not valid JSON', () => {
    expect(decodeJwtPayload('a.bm90LWpzb24.c')).toBeNull()
  })

  it('decodes a well-formed token payload', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = makeToken({ sub: 'user@example.com', exp })
    expect(decodeJwtPayload(token)).toEqual({ sub: 'user@example.com', exp })
  })

  it('handles base64url characters (- and _) correctly', () => {
    // Pick a payload whose base64 encoding is likely to contain +/ in standard base64.
    const token = makeToken({ data: '>>>???other-safe-chars<<<subjecthere' })
    const decoded = decodeJwtPayload(token)
    expect(decoded.data).toBe('>>>???other-safe-chars<<<subjecthere')
  })
})

describe('isTokenExpired', () => {
  it('treats a missing token as expired', () => {
    expect(isTokenExpired(null)).toBe(true)
    expect(isTokenExpired(undefined)).toBe(true)
    expect(isTokenExpired('')).toBe(true)
  })

  it('treats a malformed token as expired', () => {
    expect(isTokenExpired('garbage')).toBe(true)
  })

  it('treats a token without an exp claim as expired', () => {
    const token = makeToken({ sub: 'user@example.com' })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('is false for a token that expires well in the future', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = makeToken({ exp })
    expect(isTokenExpired(token)).toBe(false)
  })

  it('is true for a token whose exp is in the past', () => {
    const exp = Math.floor(Date.now() / 1000) - 60
    const token = makeToken({ exp })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('applies the clock-skew buffer near the expiry boundary', () => {
    const exp = Math.floor(Date.now() / 1000) + 5
    // Default skew (10s) treats a token expiring in 5s as already expired.
    expect(isTokenExpired(token(exp))).toBe(true)
    // With no skew, it's still valid for those 5 seconds.
    expect(isTokenExpired(token(exp), 0)).toBe(false)

    function token(e) { return makeToken({ exp: e }) }
  })
})
