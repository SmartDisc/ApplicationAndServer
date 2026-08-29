/**
 * Input sanitizers — applied on every keystroke inside SdField.
 *
 * Layer 1 (here): strip malicious characters before they enter reactive state.
 * Layer 2 (validate.js): check format/length rules before submit.
 * Layer 3 (backend): parameterised queries / ORM — the real SQL injection defence.
 *
 * Passwords are intentionally NOT stripped of special characters; they are
 * hashed server-side and need to preserve entropy.
 */

function stripHtmlTags(value) {
  return String(value)
    .replace(/<[^>]*>/g, '')   // strip complete HTML tags
    .replace(/[<>]/g, '')      // remove stray angle brackets
}

/**
 * Human names — letters (including unicode), spaces, hyphens, apostrophes, periods.
 * Blocks everything else that could carry HTML/script/SQL payloads.
 */
export function sanitizeName(value) {
  return stripHtmlTags(value)
    .replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ\s'\-\.]/g, '')
    .slice(0, 100)
}

/**
 * Email addresses — only characters valid in an RFC 5321 address.
 * Strips anything that can't appear in a legitimate email.
 */
export function sanitizeEmail(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9@._+\-]/g, '')
    .slice(0, 254)
}

/**
 * Disc UUIDs — alphanumeric and hyphens only (RFC 4122 format).
 */
export function sanitizeUUID(value) {
  return String(value)
    .replace(/[^A-Za-z0-9\-]/g, '')
    .slice(0, 40)
}

/**
 * Passwords — strip only null bytes and C0 control characters.
 * All printable characters (including !, @, #, <, ', ") are valid in passwords
 * and must NOT be stripped; they are hashed, never interpolated into SQL.
 */
export function sanitizePassword(value) {
  return String(value)
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, 128)
}

/**
 * General short text (search queries, labels, throw names, notes).
 * Strips HTML tags and characters commonly used in SQL injection.
 */
export function sanitizeText(value) {
  return stripHtmlTags(value)
    .replace(/['"`;\\]/g, '')
    .slice(0, 300)
}
