import { z } from 'zod'
import { randomUUID } from 'crypto'
import { TRPCError } from '@trpc/server'
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { router, protectedProcedure } from '../trpc'
import { s3, S3_BUCKET } from '../../../lib/s3'

const EXPIRES = 900 // 15 minutes
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/json',
  'application/octet-stream', // fallback for unknown types
])

// Resource types that support file attachments
const ALLOWED_RESOURCE_TYPES = new Set(['TASK', 'RESOURCE', 'USER'])

async function assertResourceAccess(ctx: any, resourceType: string, resourceId: string | undefined) {
  if (!resourceId) return
  if (ctx.userRole === 'ADMIN') return

  if (resourceType === 'TASK') {
    const task = await ctx.prisma.task.findUnique({
      where: { id: resourceId },
      select: { assigneeId: true },
    })
    if (task?.assigneeId === ctx.user.id) return
  }

  if (resourceType === 'RESOURCE') {
    const resource = await ctx.prisma.resource.findUnique({
      where: { id: resourceId },
      select: { userId: true, isPublic: true },
    })
    if (resource && (resource.userId === ctx.user.id || resource.isPublic)) return
  }

  if (resourceType === 'USER' && resourceId === ctx.user.id) return

  throw new TRPCError({ code: 'FORBIDDEN' })
}

export const storageRouter = router({
  createUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        mimeType: z.string().default('application/octet-stream'),
        resourceType: z.string(),
        resourceId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ALLOWED_RESOURCE_TYPES.has(input.resourceType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File attachments are not supported for resource type "${input.resourceType}"`,
        })
      }
      if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File type "${input.mimeType}" is not supported`,
        })
      }
      await assertResourceAccess(ctx, input.resourceType, input.resourceId)

      const fileKey = `${ctx.user.id}/${randomUUID()}-${input.fileName}`
      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: fileKey,
          ContentType: input.mimeType,
        }),
        { expiresIn: EXPIRES },
      )
      return { uploadUrl, fileKey }
    }),

  confirm: protectedProcedure
    .input(
      z.object({
        fileKey: z.string(),
        fileName: z.string(),
        fileSize: z.number().int().nonnegative().default(0),
        mimeType: z.string().default('application/octet-stream'),
        resourceType: z.string(),
        resourceId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ALLOWED_RESOURCE_TYPES.has(input.resourceType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File attachments are not supported for resource type "${input.resourceType}"`,
        })
      }
      if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File type "${input.mimeType}" is not supported`,
        })
      }
      if (input.fileSize > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File exceeds the maximum size of ${MAX_FILE_SIZE / 1024 / 1024} MB`,
        })
      }
      if (!input.fileKey.startsWith(`${ctx.user.id}/`)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Invalid file ownership',
        })
      }
      await assertResourceAccess(ctx, input.resourceType, input.resourceId)
      return ctx.prisma.fileAttachment.create({
        data: { ...input, userId: ctx.user.id! },
      })
    }),

  listFor: protectedProcedure.input(z.object({ resourceType: z.string(), resourceId: z.string() })).query(async ({ ctx, input }) => {
    await assertResourceAccess(ctx, input.resourceType, input.resourceId)
    return ctx.prisma.fileAttachment.findMany({
      where: {
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        resourceType: true,
        resourceId: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
      },
    })
  }),

  getDownloadUrl: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const file = await ctx.prisma.fileAttachment.findUnique({
      where: { id: input.id },
    })
    if (!file) throw new TRPCError({ code: 'NOT_FOUND' })
    await assertResourceAccess(ctx, file.resourceType, file.resourceId ?? undefined)
    if (!file.resourceId && file.userId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: file.fileKey }), { expiresIn: EXPIRES })
    return { url }
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const file = await ctx.prisma.fileAttachment.findUnique({
      where: { id: input.id },
    })
    if (!file || file.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: file.fileKey }))
    return ctx.prisma.fileAttachment.delete({ where: { id: input.id } })
  }),
})
