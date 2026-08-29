import { describe, it, expect } from 'vitest'
import {
  sanitizeName,
  sanitizeEmail,
  sanitizeUUID,
  sanitizePassword,
  sanitizeText,
} from '../utils/sanitize.js'

describe('sanitizeName', () => {
  it('strips HTML tag syntax (angle brackets and tag names)', () => {
    expect(sanitizeName('<b>John</b>')).toBe('John')
  })
  it('strips angle brackets left after tag removal', () => {
    expect(sanitizeName('John<>')).toBe('John')
  })
  it('strips semicolons and digits but preserves apostrophes and hyphens (needed for O\'Brien-style names)', () => {
    // apostrophes and hyphens are intentionally allowed in sanitizeName
    expect(sanitizeName("John; DROP TABLE")).toBe('John DROP TABLE')
    expect(sanitizeName("O'Brien-Smith")).toBe("O'Brien-Smith")
  })
  it('preserves unicode letters', () => {
    expect(sanitizeName('Ångström')).toBe('Ångström')
  })
  it('preserves hyphens, apostrophes, and periods in names', () => {
    expect(sanitizeName("O'Brien-Smith Jr.")).toBe("O'Brien-Smith Jr.")
  })
  it('truncates to 100 characters', () => {
    const long = 'A'.repeat(120)
    expect(sanitizeName(long)).toHaveLength(100)
  })
})

describe('sanitizeEmail', () => {
  it('strips characters not valid in an email address', () => {
    expect(sanitizeEmail('user<script>@example.com')).toBe('userscript@example.com')
  })
  it('preserves valid email characters', () => {
    expect(sanitizeEmail('user+tag@sub.example.co.uk')).toBe('user+tag@sub.example.co.uk')
  })
  it('strips spaces', () => {
    expect(sanitizeEmail('user @example.com')).toBe('user@example.com')
  })
  it('truncates to 254 characters', () => {
    const long = 'a'.repeat(200) + '@' + 'b'.repeat(60) + '.com'
    expect(sanitizeEmail(long).length).toBeLessThanOrEqual(254)
  })
})

describe('sanitizeUUID', () => {
  it('preserves a valid UUID format', () => {
    expect(sanitizeUUID('SD-1A2B-3C4D-5E6F')).toBe('SD-1A2B-3C4D-5E6F')
  })
  it('strips spaces and special characters', () => {
    expect(sanitizeUUID('SD 1A2B!3C4D')).toBe('SD1A2B3C4D')
  })
  it('truncates to 40 characters', () => {
    const long = 'A'.repeat(50)
    expect(sanitizeUUID(long)).toHaveLength(40)
  })
})

describe('sanitizePassword', () => {
  it('preserves all printable special characters (entropy must not be reduced)', () => {
    const pw = "P@ssw0rd!#$%^&*()_+{}|:\"<>?`~[];',./\\"
    expect(sanitizePassword(pw)).toBe(pw)
  })
  it('strips null bytes', () => {
    expect(sanitizePassword('pass\x00word')).toBe('password')
  })
  it('strips C0 control characters', () => {
    expect(sanitizePassword('pass\x01\x1Fword')).toBe('password')
  })
  it('strips DEL character (0x7F)', () => {
    expect(sanitizePassword('pass\x7Fword')).toBe('password')
  })
  it('preserves angle brackets and quotes needed for entropy', () => {
    expect(sanitizePassword('<My"Secret>')).toBe('<My"Secret>')
  })
  it('truncates to 128 characters', () => {
    const long = 'A!'.repeat(80)
    expect(sanitizePassword(long)).toHaveLength(128)
  })
})

describe('sanitizeText', () => {
  it('strips HTML tags', () => {
    expect(sanitizeText('<b>bold</b> text')).toBe('bold text')
  })
  it('strips single quotes (SQL injection vector)', () => {
    expect(sanitizeText("it's a trap")).toBe('its a trap')
  })
  it('strips double quotes', () => {
    expect(sanitizeText('say "hello"')).toBe('say hello')
  })
  it('strips semicolons', () => {
    expect(sanitizeText('DROP TABLE users;')).toBe('DROP TABLE users')
  })
  it('strips backticks', () => {
    expect(sanitizeText('`command`')).toBe('command')
  })
  it('strips backslashes', () => {
    expect(sanitizeText('path\\to\\file')).toBe('pathtofile')
  })
  it('preserves normal prose', () => {
    expect(sanitizeText('Great throw at Maple Disc Park')).toBe('Great throw at Maple Disc Park')
  })
  it('truncates to 300 characters', () => {
    const long = 'a'.repeat(350)
    expect(sanitizeText(long)).toHaveLength(300)
  })
})
