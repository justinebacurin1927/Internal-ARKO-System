import { describe, it, expect, vi } from 'vitest'

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example/signed'),
}))
vi.mock('../../../lib/s3', () => ({ s3: {}, S3_BUCKET: 'test-bucket' }))

import { storageRouter } from '../storage'

describe('storage router', () => {
  it('createUploadUrl returns a fileKey scoped under the user id', async () => {
    const ctx = { user: { id: 'u1' }, session: { user: { id: 'u1' } }, userRole: 'USER', prisma: {} } as any
    const res = await storageRouter.createCaller(ctx).createUploadUrl({
      fileName: 'photo.png',
      mimeType: 'image/png',
      resourceType: 'RESOURCE',
    })
    expect(res.uploadUrl).toBe('https://s3.example/signed')
    expect(res.fileKey.startsWith('u1/')).toBe(true)
    expect(res.fileKey.endsWith('-photo.png')).toBe(true)
  })

  it('confirm writes a FileAttachment row for the user', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'f1' })
    const ctx = { user: { id: 'u1' }, session: { user: { id: 'u1' } }, userRole: 'USER', prisma: { fileAttachment: { create } } } as any
    await storageRouter.createCaller(ctx).confirm({
      fileKey: 'u1/abc-photo.png',
      fileName: 'photo.png',
      fileSize: 10,
      mimeType: 'image/png',
      resourceType: 'RESOURCE',
    })
    expect(create.mock.calls[0][0].data.userId).toBe('u1')
  })
})
