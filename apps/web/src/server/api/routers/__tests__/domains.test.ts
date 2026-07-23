import { describe, it, expect, jest } from '@jest/globals'
import { journalRouter } from '../journal'
import { resourcesRouter } from '../resources'
import { commentsRouter } from '../comments'

describe('journal router', () => {
  it('lists entries for the current user', async () => {
    const ctx = {
      user: { id: 'u1' },
      session: { user: { id: 'u1' } },
      userRole: 'USER',
      prisma: { journalEntry: { findMany: jest.fn().mockResolvedValue([{ id: 'j1' }]) } },
    } as any
    expect(await journalRouter.createCaller(ctx).list()).toHaveLength(1)
  })
})

describe('resources router', () => {
  it('lists resources for the current user', async () => {
    const ctx = {
      user: { id: 'u1' },
      session: { user: { id: 'u1' } },
      userRole: 'USER',
      prisma: { resource: { findMany: jest.fn().mockResolvedValue([{ id: 'r1' }]) } },
    } as any
    expect(await resourcesRouter.createCaller(ctx).list()).toHaveLength(1)
  })
})

describe('comments router (polymorphic)', () => {
  it('create writes with the current userId and resource pointer', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'c1' })
    const ctx = {
      user: { id: 'u1' },
      session: { user: { id: 'u1' } },
      userRole: 'USER',
      prisma: { comment: { create } },
    } as any
    await commentsRouter.createCaller(ctx).create({
      resourceType: 'TASK',
      resourceId: 't1',
      content: 'hi',
    })
    expect(create).toHaveBeenCalledWith({
      data: { resourceType: 'TASK', resourceId: 't1', content: 'hi', userId: 'u1' },
    })
  })

  it('list filters by resource', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'c1' }])
    const ctx = {
      user: { id: 'u1' },
      session: { user: { id: 'u1' } },
      userRole: 'USER',
      prisma: { comment: { findMany } },
    } as any
    await commentsRouter.createCaller(ctx).list({ resourceType: 'TASK', resourceId: 't1' })
    expect(findMany.mock.calls[0][0].where).toEqual({ resourceType: 'TASK', resourceId: 't1' })
  })
})
