/**
 * In-memory sliding-window rate limiter.
 *
 * Stores attempt timestamps per key in a Map. Windows are millisecond-precision
 * sliding windows — old entries beyond the window are purged on every check.
 *
 * Not shared across process restarts (dev) or across multiple instances
 * (production). For multi-instance deployments, swap the store for Redis.
 */

interface RateLimiterConfig {
  /** Time window in milliseconds (default 60000 = 1 minute) */
  windowMs: number
  /** Max requests allowed within the window */
  maxRequests: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

const stores = new Map<string, number[]>()

function purge(key: string, windowMs: number): number[] {
  const now = Date.now()
  const timestamps = stores.get(key) ?? []
  const valid = timestamps.filter((t) => now - t < windowMs)
  if (valid.length === 0) {
    stores.delete(key)
  } else {
    stores.set(key, valid)
  }
  return valid
}

export function createRateLimiter(
  name: string,
  config: RateLimiterConfig = { windowMs: 60_000, maxRequests: 30 },
) {
  const keyPrefix = `ratelimit:${name}:`

  return {
    check(key: string): RateLimitResult {
      const fullKey = keyPrefix + key
      const now = Date.now()
      const windowMs = config.windowMs
      const max = config.maxRequests

      const valid = purge(fullKey, windowMs)

      if (valid.length >= max) {
        const oldest = valid[0]
        return { success: false, remaining: 0, resetAt: oldest + windowMs }
      }

      valid.push(now)
      stores.set(fullKey, valid)
      return {
        success: true,
        remaining: max - valid.length,
        resetAt: now + windowMs,
      }
    },

    /** Reset all state for this limiter (used in tests) */
    reset(): void {
      for (const k of stores.keys()) {
        if (k.startsWith(keyPrefix)) stores.delete(k)
      }
    },
  }
}

/** Pre-built limiters used across the app */
export const authLimiter = createRateLimiter('auth', {
  windowMs: 60_000,
  maxRequests: 10,
})

export const registerLimiter = createRateLimiter('register', {
  windowMs: 60_000,
  maxRequests: 5,
})

export const apiLimiter = createRateLimiter('api', {
  windowMs: 60_000,
  maxRequests: 100,
})

/** Extract a stable key from a Request object (IP or fallback) */
export function requestKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
  return ip
}
