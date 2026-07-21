import { describe, it, expect, vi } from 'vitest'
import { notificationsRouter } from '../notifications'

const ctx = (rows: any[] = []) =>
  ({
    user: { id: 'u1' },
    session: { user: { id: 'u1' } },
    userRole: 'USER',
    prisma: {
      notification: {
        findMany: vi.fn().mockResolvedValue(rows),
        count: vi.fn().mockResolvedValue(rows.length),
      },
    },
  }) as any

describe('notifications router', () => {
  it('lists notifications for the current user', async () => {
    const caller = notificationsRouter.createCaller(ctx([{ id: 'n1' }]))
    const res = await caller.list()
    expect(res).toHaveLength(1)
  })

  it('returns unread count', async () => {
    const caller = notificationsRouter.createCaller(ctx([{ id: 'n1' }]))
    expect(await caller.unreadCount()).toBe(1)
  })
})
