import { describe, it, expect, jest } from '@jest/globals'
import { notificationsRouter } from '../notifications'

const ctx = (rows: any[] = [], over: any = {}) =>
  ({
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma: {
      notification: {
        findMany: jest.fn().mockResolvedValue(rows),
        count: jest.fn().mockResolvedValue(rows.length),
        findUnique: jest.fn().mockResolvedValue({ id: 'n1', userId: 'u1' }),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'n1', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: rows.length }),
        delete: jest.fn().mockResolvedValue({ id: 'n1' }),
        ...(over.notification ?? {}),
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

describe('notifications.markRead', () => {
  it('marks the owner\'s notification as read', async () => {
    const c = ctx()
    const caller = notificationsRouter.createCaller(c)
    await caller.markRead({ id: 'n1' })
    expect(c.prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { read: true } })
  })

  it('rejects marking a notification owned by someone else', async () => {
    const c = ctx([], { notification: { findUnique: jest.fn().mockResolvedValue({ id: 'n1', userId: 'other' }) } })
    const caller = notificationsRouter.createCaller(c)
    await expect(caller.markRead({ id: 'n1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(c.prisma.notification.update).not.toHaveBeenCalled()
  })

  it('rejects marking a notification that does not exist', async () => {
    const c = ctx([], { notification: { findUnique: jest.fn().mockResolvedValue(null) } })
    const caller = notificationsRouter.createCaller(c)
    await expect(caller.markRead({ id: 'missing' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('notifications.markAllRead', () => {
  it('flips only the current user\'s unread notifications', async () => {
    const c = ctx()
    const caller = notificationsRouter.createCaller(c)
    await caller.markAllRead()
    expect(c.prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', read: false },
      data: { read: true },
    })
  })
})

describe('notifications.delete', () => {
  it('deletes the owner\'s notification', async () => {
    const c = ctx()
    const caller = notificationsRouter.createCaller(c)
    await caller.delete({ id: 'n1' })
    expect(c.prisma.notification.delete).toHaveBeenCalledWith({ where: { id: 'n1' } })
  })

  it('rejects deleting a notification owned by someone else', async () => {
    const c = ctx([], { notification: { findUnique: jest.fn().mockResolvedValue({ id: 'n1', userId: 'other' }) } })
    const caller = notificationsRouter.createCaller(c)
    await expect(caller.delete({ id: 'n1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(c.prisma.notification.delete).not.toHaveBeenCalled()
  })
})
