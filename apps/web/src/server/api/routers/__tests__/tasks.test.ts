import { describe, it, expect, jest } from '@jest/globals'
import { tasksRouter } from '../tasks'

// Builds a tRPC context with a mocked Prisma client. Override any prisma method
// per-test. Mirrors the ctx shape used in notifications.test.ts / events.test.ts.
const ctx = (over: any = {}) => {
  const prisma = {
    task: {
      findUnique: jest.fn().mockResolvedValue({ id: 't1', assigneeId: 'u1', parentId: null }),
      findFirst: jest.fn().mockResolvedValue({ position: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'tNew', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 't1', ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      delete: jest.fn().mockResolvedValue({ id: 't1' }),
      ...(over.task ?? {}),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ role: 'USER' }),
      ...(over.user ?? {}),
    },
    taskDependency: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'd1', ...data })),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      ...(over.taskDependency ?? {}),
    },
  }
  return {
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: over.userRole ?? 'USER',
    prisma,
  } as any
}

describe('tasks.update', () => {
  it('updates fields for the assignee', async () => {
    const c = ctx()
    const caller = tasksRouter.createCaller(c)
    await caller.update({ id: 't1', title: 'New title', priority: 'HIGH' })
    expect(c.prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: expect.objectContaining({ title: 'New title', priority: 'HIGH' }),
      }),
    )
  })

  it('rejects a non-assignee, non-admin', async () => {
    const c = ctx({ task: { findUnique: jest.fn().mockResolvedValue({ assigneeId: 'someone-else' }) } })
    const caller = tasksRouter.createCaller(c)
    await expect(caller.update({ id: 't1', title: 'x' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('tasks.delete', () => {
  it('re-parents subtasks to null then deletes', async () => {
    const c = ctx()
    const caller = tasksRouter.createCaller(c)
    await caller.delete({ id: 't1' })
    expect(c.prisma.task.updateMany).toHaveBeenCalledWith({
      where: { parentId: 't1' },
      data: { parentId: null },
    })
    expect(c.prisma.task.delete).toHaveBeenCalledWith({ where: { id: 't1' } })
  })
})

describe('tasks.create subtasks', () => {
  it('rejects nesting under a task that already has a parent', async () => {
    const c = ctx({
      task: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', assigneeId: 'u1', parentId: 'grandparent' }),
        findFirst: jest.fn().mockResolvedValue({ position: 0 }),
      },
    })
    const caller = tasksRouter.createCaller(c)
    await expect(caller.create({ title: 'sub', parentId: 'p1' })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('creates a subtask under a top-level parent', async () => {
    const c = ctx({
      task: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', assigneeId: 'u1', parentId: null }),
        findFirst: jest.fn().mockResolvedValue({ position: 2 }),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'tNew', ...data })),
      },
    })
    const caller = tasksRouter.createCaller(c)
    const res = await caller.create({ title: 'sub', parentId: 'p1' })
    expect(res.parentId).toBe('p1')
  })
})

describe('tasks dependencies', () => {
  it('adds a blocked-by dependency', async () => {
    const c = ctx()
    const caller = tasksRouter.createCaller(c)
    await caller.addDependency({ taskId: 't1', blockerId: 'b1' })
    expect(c.prisma.taskDependency.create).toHaveBeenCalledWith({
      data: { blockingId: 'b1', blockedId: 't1' },
    })
  })

  it('rejects a self-dependency', async () => {
    const c = ctx()
    const caller = tasksRouter.createCaller(c)
    await expect(caller.addDependency({ taskId: 't1', blockerId: 't1' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
  })

  it('rejects a dependency that would create a cycle', async () => {
    // t1 already blocks b1 (edge blocking=t1 -> blocked=b1); adding "t1 blocked by b1" closes a loop
    const c = ctx({
      taskDependency: {
        findMany: jest.fn().mockResolvedValue([{ blockingId: 't1', blockedId: 'b1' }]),
        create: jest.fn(),
      },
    })
    const caller = tasksRouter.createCaller(c)
    await expect(caller.addDependency({ taskId: 't1', blockerId: 'b1' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
  })

  it('removes a dependency', async () => {
    const c = ctx()
    const caller = tasksRouter.createCaller(c)
    await caller.removeDependency({ taskId: 't1', blockerId: 'b1' })
    expect(c.prisma.taskDependency.deleteMany).toHaveBeenCalledWith({
      where: { blockingId: 'b1', blockedId: 't1' },
    })
  })
})

describe('tasks blocked→DONE guard', () => {
  const blockedCtx = () =>
    ctx({
      taskDependency: {
        findMany: jest.fn().mockResolvedValue([{ blocking: { status: 'TODO' } }]),
      },
    })

  it('update rejects DONE while a blocker is incomplete', async () => {
    const c = blockedCtx()
    const caller = tasksRouter.createCaller(c)
    await expect(caller.update({ id: 't1', status: 'DONE' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
    expect(c.prisma.task.update).not.toHaveBeenCalled()
  })

  it('updateStatus rejects DONE while a blocker is incomplete', async () => {
    const c = blockedCtx()
    const caller = tasksRouter.createCaller(c)
    await expect(caller.updateStatus({ id: 't1', status: 'DONE' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
  })

  it('allows DONE once all blockers are DONE', async () => {
    const c = ctx({
      taskDependency: {
        findMany: jest.fn().mockResolvedValue([{ blocking: { status: 'DONE' } }]),
      },
    })
    const caller = tasksRouter.createCaller(c)
    await caller.updateStatus({ id: 't1', status: 'DONE' })
    expect(c.prisma.task.update).toHaveBeenCalled()
  })
})

describe('tasks subtask authorization', () => {
  it('rejects creating a subtask under a parent the caller cannot access', async () => {
    const c = ctx({
      task: {
        findUnique: jest.fn().mockResolvedValue({ assigneeId: 'someone-else', parentId: null }),
        findFirst: jest.fn().mockResolvedValue({ position: 0 }),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'USER' }) },
    })
    const caller = tasksRouter.createCaller(c)
    await expect(caller.create({ title: 'sub', parentId: 'p1' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
    expect(c.prisma.task.create).not.toHaveBeenCalled()
  })
})

describe('tasks.list shape', () => {
  it('includes subtasks and blockedBy for the board', async () => {
    const c = ctx({ task: { findMany: jest.fn().mockResolvedValue([]) } })
    const caller = tasksRouter.createCaller(c)
    await caller.list()
    const arg = (c.prisma.task.findMany as any).mock.calls[0][0]
    expect(arg.include).toHaveProperty('subtasks')
    expect(arg.include).toHaveProperty('blockedBy')
  })
})
