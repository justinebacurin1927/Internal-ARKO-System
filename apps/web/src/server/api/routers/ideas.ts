import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

const STATUS = ['IDEA', 'EXPLORING', 'VALIDATED', 'ARCHIVED'] as const

async function ownIdea(ctx: any, id: string) {
  const row = await ctx.prisma.idea.findUnique({ where: { id } })
  if (!row || row.userId !== ctx.user.id!) throw new TRPCError({ code: 'FORBIDDEN' })
  return row
}

export const ideasRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.idea.findMany({
      where: { userId: ctx.user.id! },
      orderBy: { updatedAt: 'desc' },
    }),
  ),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        status: z.enum(STATUS).default('IDEA'),
        tags: z.array(z.string()).default([]),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.idea.create({ data: { ...input, userId: ctx.user.id! } }),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(STATUS).optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownIdea(ctx, input.id)
      const { id, ...data } = input
      return ctx.prisma.idea.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ownIdea(ctx, input.id)
      return ctx.prisma.idea.delete({ where: { id: input.id } })
    }),

  spawnTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const idea = await ownIdea(ctx, input.id)
      const task = await ctx.prisma.task.create({
        data: {
          title: idea.title,
          description: idea.description ?? undefined,
          assigneeId: ctx.user.id!,
        },
      })
      await ctx.prisma.idea.update({
        where: { id: idea.id },
        data: { spawnedTaskId: task.id },
      })
      return task
    }),
})
