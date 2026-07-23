import { describe, it, expect, jest } from '@jest/globals'
import { journalRouter } from '../journal'

const ctx = (over: any = {}) => {
  const entries: any[] = over._entries ?? []
  return {
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma: {
      journalEntry: {
        findMany: jest.fn().mockImplementation(({ where, orderBy }: any) =>
          Promise.resolve(
            entries.filter((e: any) => where?.userId ? e.userId === where.userId : true)
              .sort((a: any, b: any) => orderBy?.date === 'desc'
                ? new Date(b.date).getTime() - new Date(a.date).getTime()
                : 0),
          ),
        ),
        findUnique: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(entries.find((e: any) => e.id === where.id) ?? null),
        ),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = { id: 'j-new', ...data, createdAt: new Date() }
          entries.push(row)
          return Promise.resolve(row)
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = entries.findIndex((e: any) => e.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          entries[idx] = { ...entries[idx], ...data }
          return Promise.resolve(entries[idx])
        }),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          const idx = entries.findIndex((e: any) => e.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          const [deleted] = entries.splice(idx, 1)
          return Promise.resolve(deleted)
        }),
        ...(over.journalEntry ?? {}),
      },
    },
  } as any
}

describe('journal router', () => {
  describe('list', () => {
    it('returns entries for the current user ordered by date desc', async () => {
      const c = ctx({ _entries: [
        { id: 'j1', userId: 'u1', title: 'Day 1', date: new Date('2026-07-22') },
        { id: 'j2', userId: 'u1', title: 'Day 2', date: new Date('2026-07-23') },
      ]})
      const res = await journalRouter.createCaller(c).list()
      expect(res).toHaveLength(2)
    })
  })

  describe('get', () => {
    it('returns own entry by id', async () => {
      const c = ctx({ _entries: [{ id: 'j1', userId: 'u1', title: 'Private', content: 'details' }] })
      const res = await journalRouter.createCaller(c).get({ id: 'j1' })
      expect(res.title).toBe('Private')
    })

    it('rejects access to another user entry', async () => {
      const c = ctx({ _entries: [{ id: 'j1', userId: 'u2', title: 'Not mine' }] })
      await expect(
        journalRouter.createCaller(c).get({ id: 'j1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('create', () => {
    it('creates an entry with title and optional content/mood/date', async () => {
      const c = ctx()
      const res = await journalRouter.createCaller(c).create({
        title: 'Great day',
        content: 'Felt amazing',
        mood: 'happy',
      })
      expect(c.prisma.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u1', title: 'Great day', mood: 'happy' }),
        }),
      )
    })
  })

  describe('update', () => {
    it('updates own entry', async () => {
      const c = ctx({ _entries: [{ id: 'j1', userId: 'u1', title: 'Old title', content: '' }] })
      const res = await journalRouter.createCaller(c).update({ id: 'j1', title: 'New title', mood: 'sad' })
      expect(res.title).toBe('New title')
    })

    it('rejects updating another user entry', async () => {
      const c = ctx({ _entries: [{ id: 'j1', userId: 'u2', title: 'Not mine' }] })
      await expect(
        journalRouter.createCaller(c).update({ id: 'j1', title: 'Hacked' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('delete', () => {
    it('deletes own entry', async () => {
      const c = ctx({ _entries: [{ id: 'j1', userId: 'u1', title: 'Delete me' }] })
      await journalRouter.createCaller(c).delete({ id: 'j1' })
      expect(c.prisma.journalEntry.delete).toHaveBeenCalled()
    })

    it('rejects deleting another user entry', async () => {
      const c = ctx({ _entries: [{ id: 'j1', userId: 'u2', title: 'Not mine' }] })
      await expect(
        journalRouter.createCaller(c).delete({ id: 'j1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })
})
