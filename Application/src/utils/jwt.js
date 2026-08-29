/**
 * Minimal JWT helpers — decode the payload client-side to read the expiry.
 * This never verifies the signature (the browser has no way to trust itself
 * to do that); the server remains the sole authority on whether a token is
 * valid. This is only used to avoid sending a token we already know is
 * expired and to decide whether a stored session can be restored offline.
 */

function base64UrlDecode(segment) {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

export function decodeJwtPayload(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(base64UrlDecode(parts[1]))
  } catch {
    return null
  }
}

/** True if the token is missing, malformed, or expired (with a small clock-skew buffer). */
export function isTokenExpired(token, skewSeconds = 10) {
  const claims = decodeJwtPayload(token)
  if (!claims || typeof claims.exp !== 'number') return true
  return Date.now() >= (claims.exp - skewSeconds) * 1000
}
