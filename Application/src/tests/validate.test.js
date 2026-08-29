import { describe, it, expect } from 'vitest'
import { required, email, minLength, password, passwordRules } from '../utils/validate.js'

describe('required', () => {
  it('returns error for empty string', () => {
    expect(required('')).toBe('This field is required')
  })
  it('returns error for whitespace-only string', () => {
    expect(required('   ')).toBe('This field is required')
  })
  it('returns error for null/undefined', () => {
    expect(required(null)).toBeTruthy()
    expect(required(undefined)).toBeTruthy()
  })
  it('returns empty string for a valid value', () => {
    expect(required('hello')).toBe('')
  })
  it('uses the provided label in the error message', () => {
    expect(required('', 'Name')).toBe('Name is required')
  })
})

describe('email', () => {
  it('returns error for empty value', () => {
    expect(email('')).toBe('Email is required')
    expect(email(null)).toBeTruthy()
  })
  it('returns error for missing @ symbol', () => {
    expect(email('notanemail')).toBeTruthy()
  })
  it('returns error for missing domain', () => {
    expect(email('user@')).toBeTruthy()
  })
  it('returns error for missing TLD', () => {
    expect(email('user@domain')).toBeTruthy()
  })
  it('accepts a valid email', () => {
    expect(email('user@example.com')).toBe('')
  })
  it('accepts email with subdomains and plus addressing', () => {
    expect(email('user+tag@sub.example.co.uk')).toBe('')
  })
})

describe('minLength', () => {
  it('returns error for empty value', () => {
    expect(minLength('', 3)).toBeTruthy()
  })
  it('returns error when value is shorter than minimum', () => {
    expect(minLength('ab', 3, 'Username')).toBe('Username must be at least 3 characters')
  })
  it('returns empty string at exactly the minimum length', () => {
    expect(minLength('abc', 3)).toBe('')
  })
  it('returns empty string when value exceeds minimum', () => {
    expect(minLength('abcdef', 3)).toBe('')
  })
})

describe('password', () => {
  it('returns error for empty value', () => {
    expect(password('')).toBe('Password is required')
    expect(password(null)).toBeTruthy()
  })
  it('returns error when shorter than 8 characters', () => {
    expect(password('Ab1!')).toBe('At least 8 characters required')
  })
  it('returns error when missing uppercase letter', () => {
    expect(password('abcdef1!')).toBeTruthy()
  })
  it('returns error when missing lowercase letter', () => {
    expect(password('ABCDEF1!')).toBeTruthy()
  })
  it('returns error when missing special character', () => {
    expect(password('Abcdef12')).toBeTruthy()
  })
  it('returns empty string for a fully valid password', () => {
    expect(password('Correct1!')).toBe('')
  })
  it('accepts various special characters', () => {
    expect(password('Passw0rd@')).toBe('')
    expect(password('Secure#99x')).toBe('')
    expect(password('My$ecret1')).toBe('')
  })
})

describe('passwordRules', () => {
  it('returns four rules', () => {
    expect(passwordRules('').length).toBe(4)
  })
  it('all rules fail for an empty password', () => {
    const rules = passwordRules('')
    expect(rules.every(r => !r.ok)).toBe(true)
  })
  it('marks length rule ok at 8+ characters', () => {
    const rules = passwordRules('abcdefgh')
    expect(rules[0].ok).toBe(true)
  })
  it('marks uppercase rule ok when uppercase present', () => {
    const rules = passwordRules('A')
    expect(rules[1].ok).toBe(true)
  })
  it('marks lowercase rule ok when lowercase present', () => {
    const rules = passwordRules('a')
    expect(rules[2].ok).toBe(true)
  })
  it('marks special character rule ok when special char present', () => {
    const rules = passwordRules('!')
    expect(rules[3].ok).toBe(true)
  })
  it('all rules pass for a fully valid password', () => {
    const rules = passwordRules('Correct1!')
    expect(rules.every(r => r.ok)).toBe(true)
  })
})
