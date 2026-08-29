/**
 * Field validators — each returns an error string or empty string.
 * Compose them in a validate() function per form.
 */

// Every validator accepts an optional trailing `t` translate function
// (from useI18n) so views can render localized messages. Omitting it keeps
// the original English strings — used by tests and any non-Vue caller.

export function required(value, label = 'This field', t) {
  if (value?.trim()) return ''
  return t ? t('validate.required', { label }) : `${label} is required`
}

export function email(value, t) {
  if (!value?.trim()) return t ? t('validate.emailRequired') : 'Email is required'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? ''
    : (t ? t('validate.emailInvalid') : 'Enter a valid email address')
}

export function minLength(value, min, label = 'This field', t) {
  if (!value?.trim()) return t ? t('validate.required', { label }) : `${label} is required`
  return value.length >= min
    ? ''
    : (t ? t('validate.minLength', { label, min }) : `${label} must be at least ${min} characters`)
}

export function password(value, t) {
  if (!value) return t ? t('validate.passwordRequired') : 'Password is required'
  if (value.length < 8)            return t ? t('validate.passwordMinLength') : 'At least 8 characters required'
  if (!/[A-Z]/.test(value))        return t ? t('validate.passwordUppercase') : 'Add an uppercase letter (A–Z)'
  if (!/[a-z]/.test(value))        return t ? t('validate.passwordLowercase') : 'Add a lowercase letter (a–z)'
  if (!/[^A-Za-z0-9]/.test(value)) return t ? t('validate.passwordSpecial') : 'Add a special character (!@#…)'
  return ''
}

/** Returns the live status of each password rule — used by SdPasswordHint. */
export function passwordRules(value = '', t) {
  return [
    { label: t ? t('validate.ruleLength')    : 'At least 8 characters',    ok: value.length >= 8 },
    { label: t ? t('validate.ruleUppercase') : 'Uppercase letter (A–Z)',   ok: /[A-Z]/.test(value) },
    { label: t ? t('validate.ruleLowercase') : 'Lowercase letter (a–z)',   ok: /[a-z]/.test(value) },
    { label: t ? t('validate.ruleSpecial')   : 'Special character (!@#$…)', ok: /[^A-Za-z0-9]/.test(value) },
  ]
}
