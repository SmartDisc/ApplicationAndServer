import { describe, it, expect } from 'vitest'
import {
  convertSpeed, convertDistance, speedUnitLabel, distanceUnitLabel,
  formatSpeed, formatDistance,
} from '../utils/units.js'

describe('convertSpeed', () => {
  it('passes km/h through unchanged', () => {
    expect(convertSpeed(28, 'km/h')).toBe(28)
  })
  it('converts km/h to mph', () => {
    expect(convertSpeed(100, 'mph')).toBe(62)
  })
  it('rounds to requested digits', () => {
    expect(convertSpeed(100, 'mph', 2)).toBe(62.14)
  })
})

describe('convertDistance', () => {
  it('passes meters through unchanged', () => {
    expect(convertDistance(41, 'm')).toBe(41)
  })
  it('converts meters to feet', () => {
    expect(convertDistance(10, 'ft')).toBe(33)
  })
  it('defaults to one decimal for meters', () => {
    expect(convertDistance(5.44, 'm')).toBe(5.4)
  })
})

describe('unit labels', () => {
  it('speedUnitLabel', () => {
    expect(speedUnitLabel('km/h')).toBe('km/h')
    expect(speedUnitLabel('mph')).toBe('mph')
  })
  it('distanceUnitLabel', () => {
    expect(distanceUnitLabel('m')).toBe('m')
    expect(distanceUnitLabel('ft')).toBe('ft')
  })
})

describe('formatSpeed / formatDistance', () => {
  it('formats speed with unit suffix', () => {
    expect(formatSpeed(28, 'km/h')).toBe('28 km/h')
    expect(formatSpeed(28, 'mph')).toBe('17 mph')
  })
  it('formats distance with unit suffix', () => {
    expect(formatDistance(41, 'm')).toBe('41 m')
    expect(formatDistance(41, 'ft')).toBe('135 ft')
  })
})
