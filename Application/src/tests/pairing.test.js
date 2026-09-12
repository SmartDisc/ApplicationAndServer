import { describe, it, expect } from 'vitest'
import { parsePairingPayload } from '../utils/pairing.js'

describe('parsePairingPayload', () => {
  it('parses a valid pairing URI', () => {
    const result = parsePairingPayload('smartdisc://pair?id=9224b45d-4ab0-4ba4-a318-de6d898d6c45&password=AbC123xyz789')
    expect(result).toEqual({ id: '9224b45d-4ab0-4ba4-a318-de6d898d6c45', password: 'AbC123xyz789' })
  })

  it('lowercases the id like manual entry does', () => {
    const result = parsePairingPayload('smartdisc://pair?id=9224B45D-4AB0-4BA4-A318-DE6D898D6C45&password=AbC123xyz789')
    expect(result.id).toBe('9224b45d-4ab0-4ba4-a318-de6d898d6c45')
  })

  it('returns null for a missing password', () => {
    expect(parsePairingPayload('smartdisc://pair?id=9224b45d-4ab0-4ba4-a318-de6d898d6c45')).toBeNull()
  })

  it('returns null for a missing id', () => {
    expect(parsePairingPayload('smartdisc://pair?password=AbC123xyz789')).toBeNull()
  })

  it('returns null for an unrelated URL', () => {
    expect(parsePairingPayload('https://example.com/?id=x&password=y')).toBeNull()
  })

  it('returns null for garbage text', () => {
    expect(parsePairingPayload('not a qr code at all')).toBeNull()
  })

  it('returns null for empty or non-string input', () => {
    expect(parsePairingPayload('')).toBeNull()
    expect(parsePairingPayload(null)).toBeNull()
    expect(parsePairingPayload(undefined)).toBeNull()
  })
})
