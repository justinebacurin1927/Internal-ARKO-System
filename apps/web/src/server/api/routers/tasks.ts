import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const tasksRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      const userId = ctx.user.id!
      return ctx.prisma.task.findMany({
        where: { assigneeId: userId },
        orderBy: { position: 'asc' },
        include: { comments: true },
      })
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
        dueDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const maxPos = await ctx.prisma.task.findFirst({
        orderBy: { position: 'desc' },
        select: { position: true },
      })
      const userId = ctx.user.id!
      return ctx.prisma.task.create({
        data: {
          title: input.title,
          description: input.description,
          priority: input.priority,
          dueDate: input.dueDate,
          assigneeId: userId,
          position: (maxPos?.position ?? -1) + 1,
        },
      })
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.task.update({
        where: { id: input.id },
        data: { status: input.status },
      })
    }),
})
