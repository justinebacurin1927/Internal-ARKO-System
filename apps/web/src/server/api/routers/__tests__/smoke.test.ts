import { describe, it, expect } from 'vitest'
import { appRouter } from '../../root'

describe('appRouter', () => {
  it('registers every domain router', () => {
    const keys = Object.keys(appRouter._def.record)
    for (const k of [
      'finance', 'tasks', 'workflows', 'messages', 'reminders', 'notes',
      'users', 'github', 'notifications', 'events', 'ideas', 'journal',
      'resources', 'comments', 'storage',
    ]) {
      expect(keys).toContain(k)
    }
  })
})
