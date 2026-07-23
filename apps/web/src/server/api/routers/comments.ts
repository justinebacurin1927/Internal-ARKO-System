import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const commentsRouter = router({
  list: protectedProcedure
    .input(z.object({ resourceType: z.string(), resourceId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.comment.findMany({
        where: { resourceType: input.resourceType, resourceId: input.resourceId },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, image: true, avatar: true } } },
      }),
    ),

  create: protectedProcedure
    .input(
      z.object({
        resourceType: z.string(),
        resourceId: z.string(),
        content: z.string().min(1).max(2000),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.comment.create({
        data: {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          content: input.content,
          userId: ctx.user.id!,
        },
      }),
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string(), content: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const c = await ctx.prisma.comment.findUnique({ where: { id: input.id } })
      if (!c || c.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.comment.update({
        where: { id: input.id },
        data: { content: input.content, edited: true },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const c = await ctx.prisma.comment.findUnique({ where: { id: input.id } })
      if (!c || c.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
      return ctx.prisma.comment.delete({ where: { id: input.id } })
    }),
})
