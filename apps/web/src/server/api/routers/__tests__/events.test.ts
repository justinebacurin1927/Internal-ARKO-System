import { describe, it, expect, jest } from '@jest/globals'
import { eventsRouter } from '../events'

// Mocked-Prisma ctx with per-test overrides. Mirrors tasks.test.ts.
const ctx = (over: any = {}) =>
  ({
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma: {
      event: {
        findMany: jest.fn().mockResolvedValue([{ id: 'e1' }]),
        findUnique: jest.fn().mockResolvedValue({ id: 'e1', userId: 'u1' }),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'eNew', ...data })),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'e1', ...data })),
        delete: jest.fn().mockResolvedValue({ id: 'e1' }),
        ...(over.event ?? {}),
      },
      sprint: {
        findMany: jest.fn().mockResolvedValue([{ id: 's1' }]),
        findUnique: jest.fn().mockResolvedValue({ id: 's1', userId: 'u1' }),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'sNew', ...data })),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 's1', ...data })),
        delete: jest.fn().mockResolvedValue({ id: 's1' }),
        ...(over.sprint ?? {}),
      },
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

describe('events.create', () => {
  it('stamps the current user onto the new event', async () => {
    const c = ctx()
    const caller = eventsRouter.createCaller(c)
    await caller.create({
      title: 'Standup',
      date: new Date('2026-01-01'),
      startTime: '09:00',
      endTime: '09:15',
    })
    expect(c.prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'Standup', userId: 'u1' }) }),
    )
  })
})

describe('events.update / delete ownership (ownEvent)', () => {
  it('updates fields for the owner', async () => {
    const c = ctx()
    const caller = eventsRouter.createCaller(c)
    await caller.update({ id: 'e1', title: 'Renamed' })
    expect(c.prisma.event.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { title: 'Renamed' } })
  })

  it('rejects updating an event owned by someone else', async () => {
    const c = ctx({ event: { findUnique: jest.fn().mockResolvedValue({ id: 'e1', userId: 'other' }) } })
    const caller = eventsRouter.createCaller(c)
    await expect(caller.update({ id: 'e1', title: 'x' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(c.prisma.event.update).not.toHaveBeenCalled()
  })

  it('rejects updating an event that does not exist', async () => {
    const c = ctx({ event: { findUnique: jest.fn().mockResolvedValue(null) } })
    const caller = eventsRouter.createCaller(c)
    await expect(caller.update({ id: 'missing', title: 'x' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('rejects deleting an event owned by someone else', async () => {
    const c = ctx({ event: { findUnique: jest.fn().mockResolvedValue({ id: 'e1', userId: 'other' }) } })
    const caller = eventsRouter.createCaller(c)
    await expect(caller.delete({ id: 'e1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(c.prisma.event.delete).not.toHaveBeenCalled()
  })
})

describe('events.createSprint', () => {
  it('stamps the current user onto the new sprint', async () => {
    const c = ctx()
    const caller = eventsRouter.createCaller(c)
    await caller.createSprint({ name: 'Sprint 1', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-14') })
    expect(c.prisma.sprint.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Sprint 1', userId: 'u1' }) }),
    )
  })
})

describe('events.updateSprint / deleteSprint ownership (ownSprint)', () => {
  it('rejects updating a sprint owned by someone else', async () => {
    const c = ctx({ sprint: { findUnique: jest.fn().mockResolvedValue({ id: 's1', userId: 'other' }) } })
    const caller = eventsRouter.createCaller(c)
    await expect(caller.updateSprint({ id: 's1', name: 'x' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(c.prisma.sprint.update).not.toHaveBeenCalled()
  })

  it('rejects deleting a sprint owned by someone else', async () => {
    const c = ctx({ sprint: { findUnique: jest.fn().mockResolvedValue({ id: 's1', userId: 'other' }) } })
    const caller = eventsRouter.createCaller(c)
    await expect(caller.deleteSprint({ id: 's1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(c.prisma.sprint.delete).not.toHaveBeenCalled()
  })
})
