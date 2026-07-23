import { describe, it, expect, jest } from '@jest/globals'
import { ideasRouter } from '../ideas'

// Mocked-Prisma ctx with per-test overrides. Mirrors tasks.test.ts.
const ctx = (over: any = {}) =>
  ({
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma: {
      idea: {
        findMany: jest.fn().mockResolvedValue([{ id: 'i1' }]),
        findUnique: jest.fn().mockResolvedValue({ id: 'i1', userId: 'u1', title: 'Idea A', description: null }),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'iNew', ...data })),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'i1', ...data })),
        delete: jest.fn().mockResolvedValue({ id: 'i1' }),
        ...(over.idea ?? {}),
      },
      task: {
        create: jest.fn().mockResolvedValue({ id: 't1', title: 'Idea A' }),
        ...(over.task ?? {}),
      },
    },
  }) as any

describe('ideas router', () => {
  it('lists ideas for the current user', async () => {
    const caller = ideasRouter.createCaller(ctx())
    expect(await caller.list()).toHaveLength(1)
  })

  it('spawnTask creates a task and links it back to the idea', async () => {
    const c = ctx()
    const caller = ideasRouter.createCaller(c)
    const task = await caller.spawnTask({ id: 'i1' })
    expect(task.id).toBe('t1')
    expect(c.prisma.task.create).toHaveBeenCalled()
    expect(c.prisma.idea.update).toHaveBeenCalledWith({ where: { id: 'i1' }, data: { spawnedTaskId: 't1' } })
  })
})

describe('ideas.create', () => {
  it('stamps the current user onto the new idea', async () => {
    const c = ctx()
    const caller = ideasRouter.createCaller(c)
    await caller.create({ title: 'Fresh idea' })
    expect(c.prisma.idea.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'Fresh idea', userId: 'u1' }) }),
    )
  })
})

describe('ideas.update / delete ownership (ownIdea)', () => {
  it('updates fields for the owner', async () => {
    const c = ctx()
    const caller = ideasRouter.createCaller(c)
    await caller.update({ id: 'i1', status: 'VALIDATED' })
    expect(c.prisma.idea.update).toHaveBeenCalledWith({ where: { id: 'i1' }, data: { status: 'VALIDATED' } })
  })

  it('rejects updating an idea owned by someone else', async () => {
    const c = ctx({ idea: { findUnique: jest.fn().mockResolvedValue({ id: 'i1', userId: 'other' }) } })
    const caller = ideasRouter.createCaller(c)
    await expect(caller.update({ id: 'i1', title: 'x' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(c.prisma.idea.update).not.toHaveBeenCalled()
  })

  it('rejects deleting an idea owned by someone else', async () => {
    const c = ctx({ idea: { findUnique: jest.fn().mockResolvedValue({ id: 'i1', userId: 'other' }) } })
    const caller = ideasRouter.createCaller(c)
    await expect(caller.delete({ id: 'i1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(c.prisma.idea.delete).not.toHaveBeenCalled()
  })
})

describe('ideas.spawnTask ownership', () => {
  it('rejects spawning from an idea owned by someone else and does not create a task', async () => {
    const c = ctx({ idea: { findUnique: jest.fn().mockResolvedValue({ id: 'i1', userId: 'other' }) } })
    const caller = ideasRouter.createCaller(c)
    await expect(caller.spawnTask({ id: 'i1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(c.prisma.task.create).not.toHaveBeenCalled()
  })
})
