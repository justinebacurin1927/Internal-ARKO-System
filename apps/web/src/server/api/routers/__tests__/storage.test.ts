import { describe, it, expect, jest } from '@jest/globals'

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example/signed'),
}))
jest.mock('../../../../lib/s3', () => ({
  s3: { send: jest.fn().mockResolvedValue({}) },
  S3_BUCKET: 'test-bucket',
}))

import { storageRouter } from '../storage'

const ctx = (over: any = {}) => {
  const prisma = {
    fileAttachment: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'f1', ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'f1' }),
      ...(over.fileAttachment ?? {}),
    },
    task: {
      findUnique: jest.fn().mockResolvedValue({ assigneeId: over.userId ?? 'u1' }),
      ...(over.task ?? {}),
    },
    resource: {
      findUnique: jest.fn().mockResolvedValue({ userId: over.userId ?? 'u1', isPublic: false }),
      ...(over.resource ?? {}),
    },
  }
  return {
    user: { id: over.userId ?? 'u1' },
    session: { user: { id: over.userId ?? 'u1' } },
    userRole: 'USER',
    prisma,
  } as any
}

describe('storage router', () => {
  describe('createUploadUrl', () => {
    it('returns a fileKey scoped under the user id', async () => {
      const res = await storageRouter.createCaller(ctx()).createUploadUrl({
        fileName: 'photo.png',
        mimeType: 'image/png',
        resourceType: 'TASK',
        resourceId: 'task-1',
      })
      expect(res.uploadUrl).toBe('https://s3.example/signed')
      expect(res.fileKey.startsWith('u1/')).toBe(true)
      expect(res.fileKey.endsWith('-photo.png')).toBe(true)
    })

    it('rejects unsupported resource types', async () => {
      await expect(
        storageRouter.createCaller(ctx()).createUploadUrl({
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          resourceType: 'INVALID',
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('rejects unsupported MIME types', async () => {
      await expect(
        storageRouter.createCaller(ctx()).createUploadUrl({
          fileName: 'virus.exe',
          mimeType: 'application/x-msdownload',
          resourceType: 'TASK',
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('accepts application/octet-stream as fallback', async () => {
      const res = await storageRouter.createCaller(ctx()).createUploadUrl({
        fileName: 'data.bin',
        mimeType: 'application/octet-stream',
        resourceType: 'TASK',
      })
      expect(res.uploadUrl).toBeDefined()
    })
  })

  describe('confirm', () => {
    it('writes a FileAttachment row for the user', async () => {
      const create = jest.fn().mockResolvedValue({ id: 'f1' })
      const c = ctx({ fileAttachment: { create } })
      await storageRouter.createCaller(c).confirm({
        fileKey: 'u1/abc-photo.png',
        fileName: 'photo.png',
        fileSize: 1024,
        mimeType: 'image/png',
        resourceType: 'TASK',
      })
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u1', fileSize: 1024 }),
        }),
      )
    })

    it('rejects files exceeding the maximum size', async () => {
      await expect(
        storageRouter.createCaller(ctx()).confirm({
          fileKey: 'u1/big.mp4',
          fileName: 'big.mp4',
          fileSize: 100 * 1024 * 1024, // 100 MB > 50 MB
          mimeType: 'application/octet-stream',
          resourceType: 'TASK',
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('rejects unsupported MIME types on confirm', async () => {
      await expect(
        storageRouter.createCaller(ctx()).confirm({
          fileKey: 'u1/bad.exe',
          fileName: 'bad.exe',
          fileSize: 100,
          mimeType: 'application/x-msdownload',
          resourceType: 'TASK',
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('rejects a file key belonging to another user', async () => {
      await expect(
        storageRouter.createCaller(ctx()).confirm({
          fileKey: 'u2/private.pdf',
          fileName: 'private.pdf',
          fileSize: 100,
          mimeType: 'application/pdf',
          resourceType: 'TASK',
          resourceId: 'task-1',
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('listFor', () => {
    it('returns files for the given resource', async () => {
      const files = [{ id: 'f1', fileName: 'doc.pdf' }]
      const c = ctx({
        fileAttachment: { findMany: jest.fn().mockResolvedValue(files) },
      })
      const res = await storageRouter.createCaller(c).listFor({ resourceType: 'TASK', resourceId: 'task-1' })
      expect(res).toEqual(files)
      expect(c.prisma.fileAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { resourceType: 'TASK', resourceId: 'task-1' },
        }),
      )
    })

    it('rejects listing a task the user cannot access', async () => {
      const c = ctx({
        task: { findUnique: jest.fn().mockResolvedValue({ assigneeId: 'u2' }) },
      })
      await expect(storageRouter.createCaller(c).listFor({ resourceType: 'TASK', resourceId: 'task-1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('getDownloadUrl', () => {
    it('returns a signed URL for the file owner', async () => {
      const c = ctx({
        fileAttachment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'f1',
            userId: 'u1',
            fileKey: 'u1/doc.pdf',
          }),
        },
      })
      const res = await storageRouter.createCaller(c).getDownloadUrl({ id: 'f1' })
      expect(res.url).toBe('https://s3.example/signed')
    })

    it('rejects a non-owner requesting download', async () => {
      const c = ctx({
        fileAttachment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'f1',
            userId: 'u2',
            fileKey: 'u2/doc.pdf',
          }),
        },
      })
      await expect(storageRouter.createCaller(c).getDownloadUrl({ id: 'f1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })

    it('returns NOT_FOUND when file does not exist', async () => {
      const c = ctx({
        fileAttachment: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      })
      await expect(storageRouter.createCaller(c).getDownloadUrl({ id: 'ghost' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })

  describe('delete', () => {
    it('deletes a file the user owns', async () => {
      const c = ctx({
        fileAttachment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'f1',
            userId: 'u1',
            fileKey: 'u1/doc.pdf',
          }),
          delete: jest.fn().mockResolvedValue({ id: 'f1' }),
        },
      })
      const res = await storageRouter.createCaller(c).delete({ id: 'f1' })
      expect(res.id).toBe('f1')
    })

    it('rejects a non-owner deleting', async () => {
      const c = ctx({
        fileAttachment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'f1',
            userId: 'u2',
            fileKey: 'u2/doc.pdf',
          }),
        },
      })
      await expect(storageRouter.createCaller(c).delete({ id: 'f1' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    })
  })

  describe('presign → confirm → list → delete round-trip', () => {
    it('simulates the full lifecycle for a file', async () => {
      const fileRows: any[] = []
      const c = ctx({
        fileAttachment: {
          findUnique: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(fileRows.find((r) => r.id === where.id) ?? null)),
          findMany: jest.fn().mockResolvedValue(fileRows),
          create: jest.fn().mockImplementation(({ data }: any) => {
            const row = { id: 'f-new', ...data }
            fileRows.push(row)
            return Promise.resolve(row)
          }),
          delete: jest.fn().mockImplementation(({ where }: any) => {
            const idx = fileRows.findIndex((r) => r.id === where.id)
            if (idx !== -1) fileRows.splice(idx, 1)
            return Promise.resolve({ id: where.id })
          }),
        },
      })
      const caller = storageRouter.createCaller(c)

      // 1. Presign
      const { fileKey } = await caller.createUploadUrl({
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        resourceType: 'TASK',
        resourceId: 'task-1',
      })

      // 2. Confirm
      await caller.confirm({
        fileKey,
        fileName: 'report.pdf',
        fileSize: 50000,
        mimeType: 'application/pdf',
        resourceType: 'TASK',
        resourceId: 'task-1',
      })

      // 3. List
      const list1 = await caller.listFor({
        resourceType: 'TASK',
        resourceId: 'task-1',
      })
      expect(list1).toHaveLength(1)
      expect(list1[0].fileName).toBe('report.pdf')

      // 4. Delete
      await caller.delete({ id: list1[0].id })

      // 5. List again — should be empty
      const list2 = await caller.listFor({
        resourceType: 'TASK',
        resourceId: 'task-1',
      })
      expect(list2).toHaveLength(0)
    })
  })
})
