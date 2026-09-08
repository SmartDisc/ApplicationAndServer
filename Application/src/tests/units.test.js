import { describe, it, expect } from 'vitest'
import {
  convertSpeed, convertDistance, speedUnitLabel, distanceUnitLabel,
  formatSpeed, formatDistance,
} from '../utils/units.js'

describe('convertSpeed', () => {
  it('converts km/h to m/s', () => {
    expect(convertSpeed(36, 'm/s')).toBe(10)
  })
  it('rounds m/s to requested digits', () => {
    expect(convertSpeed(1, 'm/s', 3)).toBeCloseTo(0.278, 3)
  })
  it('converts km/h to ft/s', () => {
    expect(convertSpeed(36, 'ft/s')).toBe(33)
  })
  it('rounds ft/s to requested digits', () => {
    expect(convertSpeed(36, 'ft/s', 2)).toBeCloseTo(32.81, 2)
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
    expect(speedUnitLabel('m/s')).toBe('m/s')
    expect(speedUnitLabel('ft/s')).toBe('ft/s')
  })
  it('distanceUnitLabel', () => {
    expect(distanceUnitLabel('m')).toBe('m')
    expect(distanceUnitLabel('ft')).toBe('ft')
  })
})

describe('formatSpeed / formatDistance', () => {
  it('formats speed with unit suffix', () => {
    expect(formatSpeed(36, 'm/s')).toBe('10 m/s')
    expect(formatSpeed(36, 'ft/s')).toBe('33 ft/s')
  })
  it('formats distance with unit suffix', () => {
    expect(formatDistance(41, 'm')).toBe('41 m')
    expect(formatDistance(41, 'ft')).toBe('135 ft')
  })
})
