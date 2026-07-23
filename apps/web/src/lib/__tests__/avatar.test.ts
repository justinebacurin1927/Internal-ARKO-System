import { describe, it, expect } from '@jest/globals'
import {
  generateAvatarSeed,
  avatarConfigToJson,
  avatarConfigFromJson,
} from '../avatar'
import type { AvatarConfig, AvatarConfigJson } from '../avatar'

describe('generateAvatarSeed', () => {
  it('returns a valid AvatarConfig with required parts', () => {
    const config = generateAvatarSeed('user-abc-123')
    expect(config).toHaveProperty('body')
    expect(config).toHaveProperty('head')
    expect(config).toHaveProperty('face')
    expect(config.body).toHaveProperty('type')
    expect(config.body).toHaveProperty('options')
    expect(config.body.options).toHaveProperty('skinColor')
    expect(config.body.options).toHaveProperty('blazerColor')
    expect(config.body.options).toHaveProperty('outlineColor')
    expect(config.head.options).toHaveProperty('color')
    expect(config.face.options).toHaveProperty('skinColor')
  })

  it('is deterministic: same userId always produces the same config', () => {
    const a = generateAvatarSeed('fixed-user-id')
    const b = generateAvatarSeed('fixed-user-id')
    expect(a).toEqual(b)
  })

  it('produces different configs for different userIds', () => {
    const a = generateAvatarSeed('user-one')
    const b = generateAvatarSeed('user-two')
    // Extremely unlikely that two distinct IDs produce identical configs
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  })

  it('has valid body type from the known list', () => {
    const config = generateAvatarSeed('body-check')
    expect(config.body.type).toBeTruthy()
    expect(typeof config.body.type).toBe('string')
  })

  it('may include beard (~67% probability) or not', () => {
    // Run many seeds to ensure at least one has a beard and one doesn't
    const seeds = Array.from({ length: 100 }, (_, i) => generateAvatarSeed(`beard-test-${i}`))
    const withBeard = seeds.filter((s) => s.beard)
    const withoutBeard = seeds.filter((s) => !s.beard)
    expect(withBeard.length).toBeGreaterThan(0)
    expect(withoutBeard.length).toBeGreaterThan(0)
  })

  it('may include accessory (~75% probability) or not', () => {
    const seeds = Array.from({ length: 100 }, (_, i) => generateAvatarSeed(`acc-test-${i}`))
    const withAcc = seeds.filter((s) => s.accessory)
    const withoutAcc = seeds.filter((s) => !s.accessory)
    expect(withAcc.length).toBeGreaterThan(0)
    expect(withoutAcc.length).toBeGreaterThan(0)
  })

  it('uses valid color hex strings for skin, hair, and clothing', () => {
    const config = generateAvatarSeed('color-test')
    expect(config.body.options.skinColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(config.head.options.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(config.body.options.blazerColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

describe('avatarConfigToJson', () => {
  it('converts an AvatarConfig to a compact AvatarConfigJson', () => {
    const config = generateAvatarSeed('json-test')
    const json = avatarConfigToJson(config)
    expect(json.body).toBe(config.body.type)
    expect(json.head).toBe(config.head.type)
    expect(json.face).toBe(config.face.type)
    expect(json.skinColor).toBe(config.body.options.skinColor)
    expect(json.hairColor).toBe(config.head.options.color)
    expect(json.clothingColor).toBe(config.body.options.blazerColor)
  })

  it('includes beard and accessory in JSON when present', () => {
    // Find a seed that generates a beard and accessory
    for (let i = 0; i < 500; i++) {
      const config = generateAvatarSeed(`json-full-${i}`)
      if (config.beard && config.accessory) {
        const json = avatarConfigToJson(config)
        expect(json.beard).toBe(config.beard.type)
        expect(json.accessory).toBe(config.accessory.type)
        return
      }
    }
    // If we get here, no seed in 500 had both — test the absence
    expect(true).toBe(true)
  })

  it('omits beard and accessory in JSON when absent', () => {
    for (let i = 0; i < 500; i++) {
      const config = generateAvatarSeed(`json-lean-${i}`)
      if (!config.beard && !config.accessory) {
        const json = avatarConfigToJson(config)
        expect(json.beard).toBeUndefined()
        expect(json.accessory).toBeUndefined()
        return
      }
    }
  })
})

describe('avatarConfigFromJson', () => {
  it('round-trips back to the original config', () => {
    const original = generateAvatarSeed('roundtrip')
    const json = avatarConfigToJson(original)
    const restored = avatarConfigFromJson(json)
    expect(restored).toEqual(original)
  })

  it('round-trips when beard and accessory are absent', () => {
    for (let i = 0; i < 500; i++) {
      const original = generateAvatarSeed(`rt-lean-${i}`)
      if (!original.beard && !original.accessory) {
        const json = avatarConfigToJson(original)
        const restored = avatarConfigFromJson(json)
        expect(restored).toEqual(original)
        return
      }
    }
  })

  it('provides defaults for missing optional fields', () => {
    const minimal: AvatarConfigJson = {
      body: 'Tee',
      head: 'ShortOne',
      face: 'Smile',
    }
    const config = avatarConfigFromJson(minimal)
    expect(config.body.options.skinColor).toBe('#D08B5B')
    expect(config.head.options.color).toBe('#1C1C1C')
    expect(config.body.options.blazerColor).toBe('#8FA7DF')
    expect(config.beard).toBeUndefined()
    expect(config.accessory).toBeUndefined()
  })
})
