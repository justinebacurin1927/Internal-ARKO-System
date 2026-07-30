import { describe, it, expect, beforeEach } from '@jest/globals'
import { createRateLimiter } from '../rate-limit'

describe('createRateLimiter', () => {
  it('allows up to maxRequests then blocks within the window', () => {
    const rl = createRateLimiter('test-basic', { windowMs: 60_000, maxRequests: 3 })
    rl.reset()
    expect(rl.check('k').success).toBe(true)
    expect(rl.check('k').success).toBe(true)
    expect(rl.check('k').success).toBe(true)
    expect(rl.check('k').success).toBe(false) // 4th blocked
  })

  it('isolates state per key', () => {
    const rl = createRateLimiter('test-iso', { windowMs: 60_000, maxRequests: 1 })
    rl.reset()
    expect(rl.check('a').success).toBe(true)
    expect(rl.check('a').success).toBe(false)
    expect(rl.check('b').success).toBe(true) // different key unaffected
  })

  it('peek() reports the limit WITHOUT consuming an attempt', () => {
    const rl = createRateLimiter('test-peek', { windowMs: 60_000, maxRequests: 2 })
    rl.reset()
    // peeking many times must not consume
    for (let i = 0; i < 10; i++) expect(rl.peek('k').success).toBe(true)
    // both real attempts still available
    expect(rl.check('k').success).toBe(true)
    expect(rl.check('k').success).toBe(true)
    expect(rl.check('k').success).toBe(false)
    // once at max, peek reports blocked
    expect(rl.peek('k').success).toBe(false)
  })

  it('clear() resets a single key without touching others', () => {
    const rl = createRateLimiter('test-clear', { windowMs: 60_000, maxRequests: 1 })
    rl.reset()
    rl.check('a')
    rl.check('b')
    expect(rl.peek('a').success).toBe(false)
    rl.clear('a')
    expect(rl.peek('a').success).toBe(true) // a cleared
    expect(rl.peek('b').success).toBe(false) // b untouched
  })

  it('models the login-lockout flow: N failures lock, success clears', () => {
    // Mirrors lib/auth.ts: peek to gate, check() on each failure, clear() on success.
    const lockout = createRateLimiter('test-lockout', { windowMs: 15 * 60_000, maxRequests: 5 })
    lockout.reset()
    const email = 'user@example.com'
    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      expect(lockout.peek(email).success).toBe(true) // not yet locked
      lockout.check(email) // record failure
    }
    // now locked
    expect(lockout.peek(email).success).toBe(false)
    // a successful login clears the counter
    lockout.clear(email)
    expect(lockout.peek(email).success).toBe(true)
  })
})
