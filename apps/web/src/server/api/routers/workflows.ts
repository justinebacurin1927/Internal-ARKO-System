import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const workflowsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id!
    return ctx.prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        definition: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      return ctx.prisma.workflow.create({
        data: {
          name: input.name,
          description: input.description,
          definition: input.definition,
          userId,
        },
      })
    }),

  execute: protectedProcedure
    .input(z.object({ workflowId: z.string(), input: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id!

      const workflow = await ctx.prisma.workflow.findFirst({
        where: { id: input.workflowId, userId },
      })
      if (!workflow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' })
      }

      return ctx.prisma.workflowExecution.create({
        data: {
          workflowId: input.workflowId,
          status: 'PENDING',
          input: input.input,
        },
      })
    }),
})
