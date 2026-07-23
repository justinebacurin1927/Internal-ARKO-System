import { describe, it, expect, jest } from '@jest/globals'
import { notesRouter } from '../notes'

const ctx = (over: any = {}) => {
  const notes: any[] = over._notes ?? []
  return {
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma: {
      note: {
        findMany: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(notes.filter((n: any) => where?.userId ? n.userId === where.userId : true)),
        ),
        findUnique: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(notes.find((n: any) => n.id === where.id) ?? null),
        ),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = { id: 'n-new', ...data, createdAt: new Date(), updatedAt: new Date() }
          notes.push(row)
          return Promise.resolve(row)
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = notes.findIndex((n: any) => n.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          notes[idx] = { ...notes[idx], ...data }
          return Promise.resolve(notes[idx])
        }),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          const idx = notes.findIndex((n: any) => n.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          const [deleted] = notes.splice(idx, 1)
          return Promise.resolve(deleted)
        }),
        ...(over.note ?? {}),
      },
    },
  } as any
}

describe('notes router', () => {
  describe('list', () => {
    it('returns notes for the current user ordered by updatedAt desc', async () => {
      const c = ctx({ _notes: [
        { id: 'n1', userId: 'u1', title: 'A', updatedAt: new Date('2026-07-20') },
        { id: 'n2', userId: 'u1', title: 'B', updatedAt: new Date('2026-07-22') },
      ]})
      const res = await notesRouter.createCaller(c).list()
      expect(res).toHaveLength(2)
      expect(c.prisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } }),
      )
    })

    it('excludes content from list response (select only title/dates)', async () => {
      const c = ctx({ _notes: [{ id: 'n1', userId: 'u1', title: 'Note' }] })
      const res = await notesRouter.createCaller(c).list()
      expect(res[0]).not.toHaveProperty('content')
    })
  })

  describe('get', () => {
    it('returns a full note by id', async () => {
      const c = ctx({ _notes: [{ id: 'n1', userId: 'u1', title: 'Secret', content: 'stuff' }] })
      const res = await notesRouter.createCaller(c).get({ id: 'n1' })
      expect(res.title).toBe('Secret')
      expect(res.content).toBe('stuff')
    })

    it('rejects access to another user note', async () => {
      const c = ctx({ _notes: [{ id: 'n1', userId: 'u2', title: 'Private' }] })
      await expect(
        notesRouter.createCaller(c).get({ id: 'n1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('returns NOT_FOUND for missing note', async () => {
      await expect(
        notesRouter.createCaller(ctx()).get({ id: 'ghost' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })

  describe('create', () => {
    it('creates a note with the current userId', async () => {
      const c = ctx()
      const res = await notesRouter.createCaller(c).create({ title: 'New note', content: 'Hello' })
      expect(c.prisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u1', title: 'New note', content: 'Hello' }),
        }),
      )
    })

    it('defaults content to empty string', async () => {
      const c = ctx()
      await notesRouter.createCaller(c).create({ title: 'Empty' })
      expect(c.prisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: '' }),
        }),
      )
    })
  })

  describe('update', () => {
    it('updates own note title and content', async () => {
      const c = ctx({ _notes: [{ id: 'n1', userId: 'u1', title: 'Old', content: '' }] })
      const res = await notesRouter.createCaller(c).update({ id: 'n1', title: 'New', content: 'Updated' })
      expect(res.title).toBe('New')
    })

    it('rejects updating another user note', async () => {
      const c = ctx({ _notes: [{ id: 'n1', userId: 'u2', title: 'Private' }] })
      await expect(
        notesRouter.createCaller(c).update({ id: 'n1', title: 'Hacked' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('delete', () => {
    it('deletes own note', async () => {
      const c = ctx({ _notes: [{ id: 'n1', userId: 'u1', title: 'Delete me' }] })
      await notesRouter.createCaller(c).delete({ id: 'n1' })
      expect(c.prisma.note.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'n1' } }),
      )
    })

    it('rejects deleting another user note', async () => {
      const c = ctx({ _notes: [{ id: 'n1', userId: 'u2', title: 'Not mine' }] })
      await expect(
        notesRouter.createCaller(c).delete({ id: 'n1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })
})
