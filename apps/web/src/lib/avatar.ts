/**
 * Open Peeps Avatar — seed generator + types
 *
 * Provides deterministic avatar configuration from a user ID,
 * and the TypeScript types used by the OpenPeepsAvatar component.
 *
 * The seed hash maps each userId to a stable combination of
 * body / head / face / beard / accessory parts, so every user
 * gets a unique, recognizable avatar without needing explicit
 * configuration.
 *
 * Options are named to match what @opeepsfun/open-peeps Effigy
 * components actually expect:
 *   Body   → skinColor, topColor/blazerColor, outlineColor
 *   Head   → outlineColor (= hair), skinColor
 *   Face   → outlineColor only
 *   Beard  → outlineColor only
 *   Accessory → outlineColor only
 *
 * @see /mnt/storage/tools/open-peeps-mono.sketch — Sketch source
 * @see @opeepsfun/open-peeps — npm package (Effigy component)
 */

// ── Parts catalog (mirrors @opeepsfun/open-peeps exports) ─────────

const EFFIGY_BODIES = [
  'BlazerBlackTee', 'ButtonPocketShirt', 'ButtonShirt', 'Coffee',
  'Computer', 'Dress', 'Explaining', 'Gaming', 'GymShirt',
  'Hoodie', 'Jacket', 'Killer', 'Paper', 'PointingUp',
  'PolkadotJacket', 'PoloSweater', 'ShirtCoat', 'SportyTee',
  'StripedTee', 'StrippedPocketTee', 'SweaterDots', 'Tee',
  'TeeArmsCrossed', 'TeeSelena', 'ThunderTee', 'Turtleneck', 'Whatever',
] as const

const HEADS = [
  'Afro', 'Bald', 'Bangs', 'BangsTwo', 'BantuKnots', 'Beanie',
  'Bear', 'Bun', 'BunClip', 'BunKnots', 'BunTwo', 'ColorBun',
  'ColorMedium', 'Cornrows', 'CornrowsLight', 'DocOne', 'DocThree',
  'DocTwo', 'DreadsOne', 'DreadsTwo', 'FlatTop', 'FlatTopLong',
  'GrayShort', 'HatHip', 'Hijab', 'LongAfro', 'LongBangs',
  'LongCurly', 'LongHair', 'MediumBangsColor', 'MediumBangs',
  'MediumBangsOne', 'MediumOne', 'MediumStraight', 'MediumThree',
  'MediumTwo', 'Mohawk', 'MohawkKnots', 'NoHairThree', 'NoHairTwo',
  'Pomp', 'Shaved', 'ShavedOne', 'ShavedThree', 'ShortFive',
  'ShortFour', 'ShortOne', 'ShortThree', 'ShortTwo', 'Turban',
  'Twists', 'TwistsTwo', 'Wavy',
] as const

const FACES = [
  'Angry', 'AngryFang', 'Awe', 'BigSmile', 'Blank', 'Calm',
  'CalmWithMask', 'Cheeky', 'CheersWithMask', 'Concerned',
  'ConcernedFear', 'Contempt', 'Cute', 'Cyclops', 'Driven',
  'EatingHappy', 'Explaining', 'EyesClosed', 'Fear', 'Hectic',
  'LoveGrinTeeth', 'LoveGrinTongue', 'Monster', 'Old', 'Rage',
  'Serious', 'Smile', 'SmileLOL', 'SmileTeeth', 'SmileWithMask',
  'Solemn', 'Suspicious', 'Tired',
] as const

const BEARDS = [
  'Chin', 'FullColor', 'Full', 'FullMax', 'FullMedium',
  'GoateeFull', 'Goatee', 'MustacheBull', 'MustacheEight',
  'MustacheFive', 'MustacheNine', 'MustacheSeven', 'MustacheSix',
  'MustacheThinBull', 'MustacheThin', 'MustacheYosemite',
] as const

const ACCESSORIES = [
  'Eyepatch', 'Glasses', 'GlassesFive', 'GlassesFour', 'GlassesSix',
  'GlassesThree', 'GlassesTwo', 'Sunglasses', 'SunglassesTwo',
] as const

// ── Color palettes ───────────────────────────────────────────────

const SKIN_TONES = [
  '#D08B5B', '#E0AC69', '#C27C4A', '#A45D2E', '#8B4513',
  '#F1C27D', '#DEB887', '#CD853F', '#E8BEAC', '#F5DEB3',
] as const

const HAIR_COLORS = [
  '#1C1C1C', '#3A2E1E', '#5C3A1E', '#8B5E3C', '#B8860B',
  '#DAA520', '#D2691E', '#A0522D', '#4A3728', '#2F1B0E',
] as const

const CLOTHING_COLORS = [
  '#8FA7DF', '#E76F51', '#2A9D8F', '#E9C46A', '#F4A261',
  '#264653', '#6B9080', '#A8DADC', '#457B9D', '#1D3557',
  '#E63946', '#F1FAEE', '#588157', '#A3B18A', '#780000',
] as const

// ── Types ────────────────────────────────────────────────────────

export interface AvatarPiece {
  type: string
  options: Record<string, string>
}

export interface AvatarConfig {
  body: AvatarPiece
  head: AvatarPiece
  face: AvatarPiece
  beard?: AvatarPiece
  accessory?: AvatarPiece
}

export interface AvatarConfigJson {
  body: string
  head: string
  face: string
  beard?: string
  accessory?: string
  skinColor?: string
  hairColor?: string
  clothingColor?: string
}

// ── Simple hash for deterministic seeding ───────────────────────

function hashUserId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  return Math.abs(h) >>> 0
}

function pick<T>(arr: readonly T[], seed: number, offset: number): T {
  return arr[(seed + offset) % arr.length]
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Generate a deterministic avatar configuration from a user ID.
 *
 * The same ID always produces the same avatar. The seed spreads
 * across all part categories so no two IDs clash on every dimension.
 *
 * Options match @opeepsfun/open-peeps Effigy component expectations:
 *   body   → skinColor, topColor + blazerColor (dual-key), outlineColor
 *   head   → outlineColor (=hair), skinColor
 *   face   → outlineColor
 *   beard  → outlineColor
 *   accessory → outlineColor
 */
export function generateAvatarSeed(userId: string): AvatarConfig {
  const seed = hashUserId(userId)

  const bodyType = pick(EFFIGY_BODIES, seed, 0)
  const headType = pick(HEADS, seed, 1)
  const faceType = pick(FACES, seed, 2)
  const hasBeard = (seed % 3) !== 0  // ~67% chance of facial hair
  const hasAccessory = (seed % 4) !== 0  // ~75% chance of accessory

  const skinColor = pick(SKIN_TONES, seed, 3)
  const hairColor = pick(HAIR_COLORS, seed, 4)
  const clothingColor = pick(CLOTHING_COLORS, seed, 5)

  return {
    body: {
      type: bodyType,
      options: { skinColor, topColor: clothingColor, blazerColor: clothingColor, outlineColor: '#000' },
    },
    head: {
      type: headType,
      options: { outlineColor: hairColor, skinColor },
    },
    face: {
      type: faceType,
      options: { outlineColor: '#000' },
    },
    ...(hasBeard
      ? { beard: { type: pick(BEARDS, seed, 6), options: { outlineColor: hairColor } } }
      : {}),
    ...(hasAccessory
      ? { accessory: { type: pick(ACCESSORIES, seed, 7), options: { outlineColor: clothingColor } } }
      : {}),
  }
}

/**
 * Serialise an AvatarConfig to the compact JSON string stored in
 * the User record.
 */
export function avatarConfigToJson(config: AvatarConfig): AvatarConfigJson {
  return {
    body: config.body.type,
    head: config.head.type,
    face: config.face.type,
    beard: config.beard?.type,
    accessory: config.accessory?.type,
    skinColor: config.body.options.skinColor,
    hairColor: config.head.options.outlineColor,
    clothingColor: config.body.options.topColor ?? config.body.options.blazerColor,
  }
}

/**
 * Parse the stored JSON back into an AvatarConfig for the Effigy
 * component to render.
 */
export function avatarConfigFromJson(json: AvatarConfigJson): AvatarConfig {
  const { body, head, face, beard, accessory, skinColor, hairColor, clothingColor } = json

  return {
    body: {
      // Use a fallback body type if none provided — prevents Effigy crashing
      // with require("./body/effigy/undefined") when the DB stores a bare {}.
      type: body || 'Tee',
      options: {
        skinColor: skinColor ?? '#D08B5B',
        topColor: clothingColor ?? '#8FA7DF',
        blazerColor: clothingColor ?? '#8FA7DF',
        outlineColor: '#000',
      },
    },
    head: {
      type: head || 'NoHairTwo',
      options: { outlineColor: hairColor ?? '#1C1C1C', skinColor: skinColor ?? '#D08B5B' },
    },
    face: {
      type: face || 'Smile',
      options: { outlineColor: '#000' },
    },
    ...(beard ? { beard: { type: beard, options: { outlineColor: hairColor ?? '#1C1C1C' } } } : {}),
    ...(accessory ? { accessory: { type: accessory, options: { outlineColor: clothingColor ?? '#8FA7DF' } } } : {}),
  }
}
