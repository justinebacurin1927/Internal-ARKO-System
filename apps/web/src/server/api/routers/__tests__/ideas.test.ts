import { describe, it, expect, vi } from 'vitest'
import { ideasRouter } from '../ideas'

describe('ideas router', () => {
  it('lists ideas for the current user', async () => {
    const ctx = {
      user: { id: 'u1' },
      session: { user: { id: 'u1' } },
      userRole: 'USER',
      prisma: { idea: { findMany: vi.fn().mockResolvedValue([{ id: 'i1' }]) } },
    } as any
    const caller = ideasRouter.createCaller(ctx)
    expect(await caller.list()).toHaveLength(1)
  })

  it('spawnTask creates a task and links it back to the idea', async () => {
    const ideaUpdate = vi.fn().mockResolvedValue({})
    const taskCreate = vi.fn().mockResolvedValue({ id: 't1', title: 'Idea A' })
    const ctx = {
      user: { id: 'u1' },
      session: { user: { id: 'u1' } },
      userRole: 'USER',
      prisma: {
        idea: {
          findUnique: vi.fn().mockResolvedValue({ id: 'i1', userId: 'u1', title: 'Idea A', description: null }),
          update: ideaUpdate,
        },
        task: { create: taskCreate },
      },
    } as any
    const caller = ideasRouter.createCaller(ctx)
    const task = await caller.spawnTask({ id: 'i1' })
    expect(task.id).toBe('t1')
    expect(taskCreate).toHaveBeenCalled()
    expect(ideaUpdate).toHaveBeenCalledWith({ where: { id: 'i1' }, data: { spawnedTaskId: 't1' } })
  })
})
