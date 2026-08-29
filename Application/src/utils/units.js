/**
 * Speed and distance conversion/formatting helpers, driven by the user's
 * unit preferences (usePreferences: speedUnit 'km/h'|'mph', distanceUnit 'm'|'ft').
 * All raw/stored values in the app are in metric base units (km/h, meters) —
 * these helpers convert to the display unit only at render time.
 */

const KMH_TO_MPH = 0.621371
const M_TO_FT = 3.28084

export function kmhToMph(kmh) {
  return kmh * KMH_TO_MPH
}

export function metersToFeet(m) {
  return m * M_TO_FT
}

/** Numeric value converted to the given speed unit, rounded to `digits`. */
export function convertSpeed(kmh, unit, digits = 0) {
  const value = unit === 'mph' ? kmhToMph(kmh) : kmh
  return Number(value.toFixed(digits))
}

/** Numeric value converted to the given distance unit, rounded to `digits`. */
export function convertDistance(meters, unit, digits) {
  const isFt = unit === 'ft'
  const value = isFt ? metersToFeet(meters) : meters
  const d = digits ?? (isFt ? 0 : 1)
  return Number(value.toFixed(d))
}

export function speedUnitLabel(unit) {
  return unit === 'mph' ? 'mph' : 'km/h'
}

export function distanceUnitLabel(unit) {
  return unit === 'ft' ? 'ft' : 'm'
}

export function heightUnitLabel(unit) {
  return unit === 'ft' ? 'ft' : 'm'
}

/** e.g. formatSpeed(28, 'mph') -> "17 mph" */
export function formatSpeed(kmh, unit, digits = 0) {
  return `${convertSpeed(kmh, unit, digits)} ${speedUnitLabel(unit)}`
}

/** e.g. formatDistance(41, 'ft') -> "135 ft" */
export function formatDistance(meters, unit, digits) {
  return `${convertDistance(meters, unit, digits)} ${distanceUnitLabel(unit)}`
}
