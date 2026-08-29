import { ref, readonly } from 'vue'

const STORAGE_KEY = 'sd_preferences'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const _stored       = load()
const _language     = ref(_stored?.language     ?? 'en')
const _distanceUnit = ref(_stored?.distanceUnit ?? 'm')
const _speedUnit    = ref(_stored?.speedUnit    ?? 'km/h')

document.documentElement.setAttribute('lang', _language.value)

function snapshot() {
  return {
    language:     _language.value,
    distanceUnit: _distanceUnit.value,
    speedUnit:    _speedUnit.value,
  }
}

export function usePreferences() {
  function saveLanguage(lang) {
    _language.value = lang
    persist(snapshot())
    document.documentElement.setAttribute('lang', lang)
  }

  function saveDistanceUnit(unit) {
    _distanceUnit.value = unit
    persist(snapshot())
  }

  function saveSpeedUnit(unit) {
    _speedUnit.value = unit
    persist(snapshot())
  }

  return {
    language:     readonly(_language),
    distanceUnit: readonly(_distanceUnit),
    speedUnit:    readonly(_speedUnit),
    saveLanguage,
    saveDistanceUnit,
    saveSpeedUnit,
  }
}
