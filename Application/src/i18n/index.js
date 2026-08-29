import { computed } from 'vue'
import { usePreferences } from '@/composables/usePreferences'
import { translations } from './translations'

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o == null ? o : o[k]), dict)
}

function interpolate(str, params) {
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (match, name) => (name in params ? params[name] : match))
}

export function useI18n() {
  const { language } = usePreferences()

  function t(key, params) {
    const raw = lookup(translations[language.value], key) ?? lookup(translations.en, key) ?? key
    return typeof raw === 'string' ? interpolate(raw, params) : raw
  }

  return { t, language }
}
