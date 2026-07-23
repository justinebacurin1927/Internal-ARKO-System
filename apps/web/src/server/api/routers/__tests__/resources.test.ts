import { describe, it, expect, jest } from '@jest/globals'
import { resourcesRouter } from '../resources'

const ctx = (over: any = {}) => {
  const resources: any[] = over._resources ?? []
  return {
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma: {
      resource: {
        findMany: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(resources.filter((r: any) => where?.userId ? r.userId === where.userId : true)),
        ),
        findUnique: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(resources.find((r: any) => r.id === where.id) ?? null),
        ),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = { id: 'res-new', ...data, createdAt: new Date(), updatedAt: new Date() }
          resources.push(row)
          return Promise.resolve(row)
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = resources.findIndex((r: any) => r.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          resources[idx] = { ...resources[idx], ...data, updatedAt: new Date() }
          return Promise.resolve(resources[idx])
        }),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          const idx = resources.findIndex((r: any) => r.id === where.id)
          if (idx === -1) return Promise.resolve(null)
          const [deleted] = resources.splice(idx, 1)
          return Promise.resolve(deleted)
        }),
        ...(over.resource ?? {}),
      },
    },
  } as any
}

describe('resources router', () => {
  describe('list', () => {
    it('returns resources for the current user ordered by updatedAt desc', async () => {
      const c = ctx({ _resources: [
        { id: 'r1', userId: 'u1', title: 'A', updatedAt: new Date('2026-07-20') },
        { id: 'r2', userId: 'u1', title: 'B', updatedAt: new Date('2026-07-22') },
      ]})
      const res = await resourcesRouter.createCaller(c).list()
      expect(res).toHaveLength(2)
      expect(c.prisma.resource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' }, orderBy: { updatedAt: 'desc' } }),
      )
    })

    it('excludes other users resources', async () => {
      const c = ctx({ _resources: [
        { id: 'r1', userId: 'u1', title: 'Mine' },
        { id: 'r2', userId: 'u2', title: 'Not mine' },
      ]})
      const res = await resourcesRouter.createCaller(c).list()
      expect(res).toHaveLength(1)
      expect(res[0].title).toBe('Mine')
    })
  })

  describe('create', () => {
    it('creates a resource with default LINK type', async () => {
      const c = ctx()
      const res = await resourcesRouter.createCaller(c).create({
        title: 'My Link',
        url: 'https://example.com',
      })
      expect(c.prisma.resource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            title: 'My Link',
            url: 'https://example.com',
            resourceType: 'LINK',
          }),
        }),
      )
    })

    it('creates a resource with DOC type and tags', async () => {
      const c = ctx()
      await resourcesRouter.createCaller(c).create({
        title: 'Doc',
        resourceType: 'DOC',
        tags: ['dev', 'backend'],
      })
      expect(c.prisma.resource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resourceType: 'DOC',
            tags: ['dev', 'backend'],
          }),
        }),
      )
    })

    it('rejects empty title', async () => {
      const c = ctx()
      await expect(
        resourcesRouter.createCaller(c).create({ title: '' }),
      ).rejects.toThrow()
    })

    it('rejects invalid URL', async () => {
      const c = ctx()
      await expect(
        resourcesRouter.createCaller(c).create({ title: 'Bad', url: 'not-a-url' }),
      ).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('updates own resource title and type', async () => {
      const c = ctx({ _resources: [
        { id: 'r1', userId: 'u1', title: 'Old', resourceType: 'LINK' },
      ]})
      const res = await resourcesRouter.createCaller(c).update({
        id: 'r1',
        title: 'New',
        resourceType: 'FILE',
      })
      expect(res.title).toBe('New')
      expect(res.resourceType).toBe('FILE')
    })

    it('rejects updating another user resource', async () => {
      const c = ctx({ _resources: [
        { id: 'r1', userId: 'u2', title: 'Not mine' },
      ]})
      await expect(
        resourcesRouter.createCaller(c).update({ id: 'r1', title: 'Hacked' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('rejects updating non-existent resource', async () => {
      const c = ctx()
      await expect(
        resourcesRouter.createCaller(c).update({ id: 'ghost', title: 'Nope' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('delete', () => {
    it('deletes own resource', async () => {
      const c = ctx({ _resources: [
        { id: 'r1', userId: 'u1', title: 'Delete me' },
      ]})
      await resourcesRouter.createCaller(c).delete({ id: 'r1' })
      expect(c.prisma.resource.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r1' } }),
      )
    })

    it('rejects deleting another user resource', async () => {
      const c = ctx({ _resources: [
        { id: 'r1', userId: 'u2', title: 'Not mine' },
      ]})
      await expect(
        resourcesRouter.createCaller(c).delete({ id: 'r1' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('rejects deleting non-existent resource', async () => {
      const c = ctx()
      await expect(
        resourcesRouter.createCaller(c).delete({ id: 'ghost' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })
})
