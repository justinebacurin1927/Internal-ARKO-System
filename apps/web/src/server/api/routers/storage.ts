import { z } from 'zod'
import { randomUUID } from 'crypto'
import { TRPCError } from '@trpc/server'
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { router, protectedProcedure } from '../trpc'
import { s3, S3_BUCKET } from '../../../lib/s3'

const EXPIRES = 900 // 15 minutes

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
    .mutation(({ ctx, input }) =>
      ctx.prisma.fileAttachment.create({
        data: { ...input, userId: ctx.user.id! },
      }),
    ),

  listFor: protectedProcedure
    .input(z.object({ resourceType: z.string(), resourceId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.fileAttachment.findMany({
        where: { resourceType: input.resourceType, resourceId: input.resourceId },
        orderBy: { createdAt: 'desc' },
      }),
    ),

  getDownloadUrl: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const file = await ctx.prisma.fileAttachment.findUnique({ where: { id: input.id } })
      if (!file || file.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: file.fileKey }),
        { expiresIn: EXPIRES },
      )
      return { url }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.fileAttachment.findUnique({ where: { id: input.id } })
      if (!file || file.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: file.fileKey }))
      return ctx.prisma.fileAttachment.delete({ where: { id: input.id } })
    }),
})
