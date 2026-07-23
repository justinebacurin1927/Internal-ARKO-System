import { describe, it, expect, jest } from '@jest/globals'
import { remindersRouter } from '../reminders'

const ctx = (over: any = {}) => {
  const reminders: any[] = over._reminders ?? []
  return {
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma: {
      reminder: {
        findMany: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(reminders.filter((r: any) => where?.userId ? r.userId === where.userId : true)),
        ),
        findUnique: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(reminders.find((r: any) => r.id === where.id) ?? null),
        ),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = { id: 'r-new', ...data, createdAt: new Date() }
          reminders.push(row)
          return Promise.resolve(row)
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = reminders.findIndex((r: any) => r.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          reminders[idx] = { ...reminders[idx], ...data }
          return Promise.resolve(reminders[idx])
        }),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          const idx = reminders.findIndex((r: any) => r.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          const [deleted] = reminders.splice(idx, 1)
          return Promise.resolve(deleted)
        }),
        ...(over.reminder ?? {}),
      },
    },
  } as any
}

describe('reminders router', () => {
  describe('list', () => {
    it('returns reminders for the current user ordered by dueAt asc', async () => {
      const c = ctx({ _reminders: [
        { id: 'r1', userId: 'u1', title: 'A', dueAt: new Date('2026-07-25') },
        { id: 'r2', userId: 'u1', title: 'B', dueAt: new Date('2026-07-24') },
      ]})
      const res = await remindersRouter.createCaller(c).list()
      expect(res).toHaveLength(2)
      expect(c.prisma.reminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' }, orderBy: { dueAt: 'asc' } }),
      )
    })
  })

  describe('create', () => {
    it('creates a reminder with parsed date', async () => {
      const c = ctx()
      const dueAt = new Date('2026-08-01T10:00:00Z')
      await remindersRouter.createCaller(c).create({ title: 'Meeting', dueAt })
      expect(c.prisma.reminder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u1', title: 'Meeting', dueAt }),
        }),
      )
    })

    it('creates a reminder with ISO string date', async () => {
      const c = ctx()
      await remindersRouter.createCaller(c).create({ title: 'Call', dueAt: '2026-08-01T14:00:00Z' })
      expect(c.prisma.reminder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Call' }),
        }),
      )
    })

    it('includes optional note', async () => {
      const c = ctx()
      await remindersRouter.createCaller(c).create({ title: 'With note', note: 'Remember this', dueAt: new Date() })
      expect(c.prisma.reminder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ note: 'Remember this' }),
        }),
      )
    })
  })

  describe('toggleDone', () => {
    it('marks an owned reminder as done', async () => {
      const c = ctx({ _reminders: [{ id: 'r1', userId: 'u1', title: 'Task', isDone: false }] })
      const res = await remindersRouter.createCaller(c).toggleDone({ id: 'r1', isDone: true })
      expect(res.isDone).toBe(true)
    })

    it('rejects toggling another user reminder', async () => {
      const c = ctx({ _reminders: [{ id: 'r1', userId: 'u2', title: 'Not mine', isDone: false }] })
      await expect(
        remindersRouter.createCaller(c).toggleDone({ id: 'r1', isDone: true }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('returns NOT_FOUND for missing reminder', async () => {
      await expect(
        remindersRouter.createCaller(ctx()).toggleDone({ id: 'ghost', isDone: true }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })

  describe('delete', () => {
    it('deletes an owned reminder', async () => {
      const c = ctx({ _reminders: [{ id: 'r1', userId: 'u1', title: 'Delete me' }] })
      await remindersRouter.createCaller(c).delete({ id: 'r1' })
      expect(c.prisma.reminder.delete).toHaveBeenCalled()
    })

    it('rejects deleting another user reminder', async () => {
      const c = ctx({ _reminders: [{ id: 'r1', userId: 'u2', title: 'Not mine' }] })
      await expect(
        remindersRouter.createCaller(c).delete({ id: 'r1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })
})
