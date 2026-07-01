import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const workflowsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.workflow.findMany({
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
      return ctx.prisma.workflow.create({
        data: {
          name: input.name,
          description: input.description,
          definition: input.definition,
        },
      })
    }),

  execute: protectedProcedure
    .input(z.object({ workflowId: z.string(), input: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.prisma.workflow.findUnique({
        where: { id: input.workflowId },
      })
      if (!workflow) throw new Error('Workflow not found')

      return ctx.prisma.workflowExecution.create({
        data: {
          workflowId: input.workflowId,
          status: 'PENDING',
          input: input.input,
        },
      })
    }),
})
