import { describe, it, expect, vi } from 'vitest'
import { eventsRouter } from '../events'

const ctx = () =>
  ({
    user: { id: 'u1' },
    session: { user: { id: 'u1' } },
    userRole: 'USER',
    prisma: {
      event: { findMany: vi.fn().mockResolvedValue([{ id: 'e1' }]) },
      sprint: { findMany: vi.fn().mockResolvedValue([{ id: 's1' }]) },
    },
  }) as any

describe('events router', () => {
  it('lists events for the current user', async () => {
    const caller = eventsRouter.createCaller(ctx())
    expect(await caller.list()).toHaveLength(1)
  })

  it('lists sprints for the current user', async () => {
    const caller = eventsRouter.createCaller(ctx())
    expect(await caller.listSprints()).toHaveLength(1)
  })
})
