import { describe, it, expect, jest } from '@jest/globals'
import { commentsRouter } from '../comments'

const ctx = (over: any = {}) => {
  const prisma = {
    comment: {
      findMany: jest.fn().mockResolvedValue([{ id: 'c1', content: 'hi' }]),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'c1', ...data })),
      findUnique: jest.fn().mockResolvedValue({ id: 'c1', userId: 'u1' }),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'c1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'c1' }),
      ...(over.comment ?? {}),
    },
  }
  return {
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma,
  } as any
}

describe('comments.list', () => {
  it('lists comments for a resource', async () => {
    const c = ctx()
    const caller = commentsRouter.createCaller(c)
    const res = await caller.list({ resourceType: 'TASK', resourceId: 't1' })
    expect(res).toHaveLength(1)
    expect(c.prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { resourceType: 'TASK', resourceId: 't1' } }),
    )
  })
})

describe('comments.create', () => {
  it('sets the author from context', async () => {
    const c = ctx()
    const caller = commentsRouter.createCaller(c)
    await caller.create({ resourceType: 'TASK', resourceId: 't1', content: 'hello' })
    expect(c.prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', content: 'hello' }) }),
    )
  })
})

describe('comments.update', () => {
  it('lets the author edit and flags it as edited', async () => {
    const c = ctx()
    const caller = commentsRouter.createCaller(c)
    await caller.update({ id: 'c1', content: 'edited text' })
    expect(c.prisma.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { content: 'edited text', edited: true } }),
    )
  })

  it('rejects a non-author', async () => {
    const c = ctx({ comment: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', userId: 'other' }) } })
    const caller = commentsRouter.createCaller(c)
    await expect(caller.update({ id: 'c1', content: 'x' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('comments.delete', () => {
  it('lets the author delete', async () => {
    const c = ctx()
    const caller = commentsRouter.createCaller(c)
    await caller.delete({ id: 'c1' })
    expect(c.prisma.comment.delete).toHaveBeenCalledWith({ where: { id: 'c1' } })
  })

  it('rejects a non-author', async () => {
    const c = ctx({ comment: { findUnique: jest.fn().mockResolvedValue({ id: 'c1', userId: 'other' }) } })
    const caller = commentsRouter.createCaller(c)
    await expect(caller.delete({ id: 'c1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
