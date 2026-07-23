'use client'

import { Effigy } from '@opeepsfun/open-peeps'
import type { CSSProperties } from 'react'
import { generateAvatarSeed, avatarConfigFromJson, type AvatarConfigJson } from '@/lib/avatar'

interface OpenPeepsAvatarProps {
  /** User ID — used to seed a deterministic avatar when no config is stored */
  userId?: string
  /** Stored avatar configuration (JSON string from DB, or pre-parsed object) */
  avatarJson?: string | object | null
  /** Optional explicit config (takes priority over seed/json) */
  config?: AvatarConfigJson
  /** CSS size */
  size?: number
  className?: string
  style?: CSSProperties
  /** User name for aria-label (accessibility) */
  userName?: string
}

/**
 * Open Peeps Avatar component.
 *
 * Renders a hand-drawn illustration avatar using `@opeepsfun/open-peeps`
 * Effigy. Falls through three sources in priority order:
 *   1. Explicit `config`
 *   2. Stored `avatarJson` (JSON string from DB)
 *   3. Deterministic seed from `userId`
 *
 * @example
 *   <OpenPeepsAvatar userId={user.id} size={48} />
 *   <OpenPeepsAvatar avatarJson={user.avatar} size={80} />
 */
export function OpenPeepsAvatar({
  userId,
  avatarJson,
  config: explicitConfig,
  size = 40,
  className,
  style,
  userName,
}: OpenPeepsAvatarProps) {
  // Determine the config source
  const cfg = (() => {
    if (explicitConfig) return explicitConfig

    if (avatarJson) {
      try {
        const parsed = typeof avatarJson === 'string' ? JSON.parse(avatarJson) : avatarJson
        return parsed as AvatarConfigJson
      } catch {
        // Invalid JSON or object — fall through to seed
      }
    }

    if (userId) {
      const seed = generateAvatarSeed(userId)
      return {
        body: seed.body.type,
        head: seed.head.type,
        face: seed.face.type,
        beard: seed.beard?.type,
        accessory: seed.accessory?.type,
        skinColor: seed.body.options.skinColor,
        hairColor: seed.head.options.color,
        clothingColor: seed.body.options.blazerColor,
      }
    }

    return null
  })()

  if (!cfg) {
    // No data: render a fallback placeholder (silent — no broken image)
    return (
      <div
        className={className}
        role="img"
        aria-label={userName ? `Avatar for ${userName}` : 'Avatar placeholder'}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#e5e7eb',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.round(size * 0.4),
          color: '#9ca3af',
          ...style,
        }}
      >
        ?
      </div>
    )
  }

  const avatarConfig = avatarConfigFromJson(cfg)

  return (
    <span className={className} style={{ display: 'inline-flex', lineHeight: 0 }} role="img" aria-label={userName ? `Avatar for ${userName}` : 'User avatar'}>
      <Effigy
        body={avatarConfig.body}
        head={avatarConfig.head}
        face={avatarConfig.face}
        beard={avatarConfig.beard}
        accessory={avatarConfig.accessory}
        style={{ width: size, height: size * 1.2, ...style }}
      />
    </span>
  )
}
