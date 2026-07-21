import { describe, it, expect } from 'vitest'
import { appRouter } from '../../root'

describe('appRouter', () => {
  it('exposes the notes router', () => {
    expect(Object.keys(appRouter._def.record)).toContain('notes')
  })
})
