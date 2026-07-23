import { describe, it, expect, jest } from '@jest/globals'
import { workflowsRouter } from '../workflows'

const goodDef = JSON.stringify({
  steps: [
    { name: 's1', action: 'log', message: 'hello' },
    { name: 's2', action: 'noop' },
  ],
})

const ctx = (over: any = {}) => {
  const prisma = {
    workflow: {
      findFirst: jest.fn().mockResolvedValue({ id: 'w1', userId: 'u1', definition: goodDef }),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'w1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'w1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'w1' }),
      ...(over.workflow ?? {}),
    },
    workflowExecution: {
      create: jest.fn().mockResolvedValue({ id: 'e1', status: 'PENDING' }),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'e1', ...data })),
      findUnique: jest.fn().mockResolvedValue({
        id: 'e1',
        workflow: { userId: 'u1' },
        logs: [],
      }),
      findMany: jest.fn().mockResolvedValue([]),
      ...(over.workflowExecution ?? {}),
    },
    executionLog: {
      create: jest.fn().mockResolvedValue({ id: 'l1' }),
      ...(over.executionLog ?? {}),
    },
  }
  return {
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma,
  } as any
}

const statuses = (c: any) =>
  (c.prisma.workflowExecution.update as any).mock.calls.map((call: any[]) => call[0].data.status)

describe('workflows.create', () => {
  it('rejects invalid JSON definition', async () => {
    const caller = workflowsRouter.createCaller(ctx())
    await expect(
      caller.create({ name: 'x', definition: '{ not json' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('rejects a definition with an unknown step action', async () => {
    const caller = workflowsRouter.createCaller(ctx())
    const bad = JSON.stringify({ steps: [{ name: 's', action: 'launch-missiles' }] })
    await expect(caller.create({ name: 'x', definition: bad })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
  })

  it('creates a workflow with a valid definition', async () => {
    const c = ctx()
    const caller = workflowsRouter.createCaller(c)
    const res = await caller.create({ name: 'Onboarding', definition: goodDef })
    expect(res.name).toBe('Onboarding')
  })
})

describe('workflows.execute', () => {
  it('runs steps PENDING → RUNNING → COMPLETED and logs each step', async () => {
    const c = ctx()
    const caller = workflowsRouter.createCaller(c)
    await caller.execute({ workflowId: 'w1' })

    expect(c.prisma.workflowExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) }),
    )
    const seq = statuses(c)
    expect(seq).toContain('RUNNING')
    expect(seq[seq.length - 1]).toBe('COMPLETED')
    // one log per step (2 steps)
    expect(c.prisma.executionLog.create).toHaveBeenCalledTimes(2)

    // AC #2: startedAt / completedAt / output are actually populated
    const updates = (c.prisma.workflowExecution.update as any).mock.calls.map(
      (call: any[]) => call[0].data,
    )
    const running = updates.find((d: any) => d.status === 'RUNNING')
    expect(running.startedAt).toBeInstanceOf(Date)
    const completed = updates.find((d: any) => d.status === 'COMPLETED')
    expect(completed.completedAt).toBeInstanceOf(Date)
    expect(completed.output).toBeTruthy()
  })

  it('marks execution FAILED and writes an ERROR log when a step throws', async () => {
    const c = ctx({
      executionLog: {
        create: jest
          .fn()
          .mockRejectedValueOnce(new Error('db blew up'))
          .mockResolvedValue({ id: 'lerr' }),
      },
    })
    const caller = workflowsRouter.createCaller(c)
    await caller.execute({ workflowId: 'w1' })
    expect(statuses(c)).toContain('FAILED')
    // an ERROR-level log is written on failure
    const levels = (c.prisma.executionLog.create as any).mock.calls.map(
      (call: any[]) => call[0].data.level,
    )
    expect(levels).toContain('ERROR')
  })

  it('rejects executing a workflow the caller does not own', async () => {
    const c = ctx({ workflow: { findFirst: jest.fn().mockResolvedValue(null) } })
    const caller = workflowsRouter.createCaller(c)
    await expect(caller.execute({ workflowId: 'w1' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('workflows.getExecution', () => {
  it('returns an execution with logs for the owner', async () => {
    const c = ctx()
    const caller = workflowsRouter.createCaller(c)
    const res = await caller.getExecution({ id: 'e1' })
    expect(res).toHaveProperty('logs')
  })

  it('rejects reading an execution the caller does not own', async () => {
    const c = ctx({
      workflowExecution: {
        findUnique: jest.fn().mockResolvedValue({ id: 'e1', workflow: { userId: 'other' }, logs: [] }),
      },
    })
    const caller = workflowsRouter.createCaller(c)
    await expect(caller.getExecution({ id: 'e1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('workflows.listExecutions', () => {
  it('lists executions for an owned workflow', async () => {
    const c = ctx()
    const caller = workflowsRouter.createCaller(c)
    await caller.listExecutions({ workflowId: 'w1' })
    expect(c.prisma.workflowExecution.findMany).toHaveBeenCalled()
  })
})

describe('workflows.update', () => {
  it('updates an owned workflow', async () => {
    const c = ctx()
    const caller = workflowsRouter.createCaller(c)
    await caller.update({ id: 'w1', name: 'Renamed' })
    expect(c.prisma.workflow.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'w1' }, data: expect.objectContaining({ name: 'Renamed' }) }),
    )
  })

  it('rejects an invalid definition on update', async () => {
    const c = ctx()
    const caller = workflowsRouter.createCaller(c)
    await expect(caller.update({ id: 'w1', definition: '{ bad' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
    expect(c.prisma.workflow.update).not.toHaveBeenCalled()
  })

  it('rejects updating a workflow the caller does not own', async () => {
    const c = ctx({ workflow: { findFirst: jest.fn().mockResolvedValue(null) } })
    const caller = workflowsRouter.createCaller(c)
    await expect(caller.update({ id: 'w1', name: 'x' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('workflows.delete', () => {
  it('deletes an owned workflow', async () => {
    const c = ctx()
    const caller = workflowsRouter.createCaller(c)
    await caller.delete({ id: 'w1' })
    expect(c.prisma.workflow.delete).toHaveBeenCalledWith({ where: { id: 'w1' } })
  })

  it('rejects deleting a workflow the caller does not own', async () => {
    const c = ctx({ workflow: { findFirst: jest.fn().mockResolvedValue(null) } })
    const caller = workflowsRouter.createCaller(c)
    await expect(caller.delete({ id: 'w1' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
