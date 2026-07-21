import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

const TYPE = ['LINK', 'FILE', 'DOC'] as const

async function ownResource(ctx: any, id: string) {
  const row = await ctx.prisma.resource.findUnique({ where: { id } })
  if (!row || row.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
  return row
}

export const resourcesRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.resource.findMany({
      where: { userId: ctx.user.id! },
      orderBy: { updatedAt: 'desc' },
    }),
  ),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        url: z.string().url().optional(),
        resourceType: z.enum(TYPE).default('LINK'),
        description: z.string().optional(),
        tags: z.array(z.string()).default([]),
        fileId: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.resource.create({ data: { ...input, userId: ctx.user.id! } }),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        url: z.string().url().optional(),
        resourceType: z.enum(TYPE).optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        fileId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownResource(ctx, input.id)
      const { id, ...data } = input
      return ctx.prisma.resource.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ownResource(ctx, input.id)
      return ctx.prisma.resource.delete({ where: { id: input.id } })
    }),
})
