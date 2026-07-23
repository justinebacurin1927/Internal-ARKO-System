import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

// Minimal, typed workflow definition. A workflow is a sequence of steps; each
// step either logs a message or does nothing. Intentionally small — richer step
// types (branching, external calls, scheduling) are out of scope for this story.
const stepSchema = z.object({
  name: z.string().min(1),
  action: z.enum(['log', 'noop']),
  message: z.string().optional(),
})
// Steps are capped: execution runs synchronously inside the request (see `execute`),
// so an unbounded step list could exhaust the serverless request budget.
const MAX_STEPS = 200
const definitionSchema = z.object({ steps: z.array(stepSchema).max(MAX_STEPS) })

function parseDefinition(raw: string) {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Definition must be valid JSON' })
  }
  const parsed = definitionSchema.safeParse(json)
  if (!parsed.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Definition must be { steps: [{ name, action: "log"|"noop", message? }] }',
    })
  }
  return parsed.data
}

/** Owner-only access to a workflow (workflows are owned via userId). */
async function assertWorkflowOwner(ctx: any, workflowId: string) {
  const workflow = await ctx.prisma.workflow.findFirst({
    where: { id: workflowId, userId: ctx.user.id },
  })
  if (!workflow) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' })
  }
  return workflow
}

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
      // Validate the definition parses to the expected shape before persisting
      parseDefinition(input.definition)

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

  // NOTE: execution is synchronous and bounded (see MAX_STEPS). A long-running or
  // externally-calling step model would need a queue/worker — out of scope here.
  execute: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await assertWorkflowOwner(ctx, input.workflowId)
      const definition = parseDefinition(workflow.definition)

      const execution = await ctx.prisma.workflowExecution.create({
        data: { workflowId: workflow.id, status: 'PENDING' },
      })

      await ctx.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'RUNNING', startedAt: new Date() },
      })

      try {
        for (const step of definition.steps) {
          const message = step.action === 'log' ? (step.message ?? '') : `ran ${step.name}`
          await ctx.prisma.executionLog.create({
            data: { executionId: execution.id, step: step.name, message, level: 'INFO' },
          })
        }

        return ctx.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            output: `${definition.steps.length} step(s) executed`,
          },
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        // Best-effort error log; never let logging failure mask the FAILED status
        await ctx.prisma.executionLog
          .create({
            data: { executionId: execution.id, step: 'error', message, level: 'ERROR' },
          })
          .catch(() => {})
        return ctx.prisma.workflowExecution.update({
          where: { id: execution.id },
          data: { status: 'FAILED', completedAt: new Date(), output: message },
        })
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        definition: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertWorkflowOwner(ctx, input.id)
      if (input.definition !== undefined) parseDefinition(input.definition)

      return ctx.prisma.workflow.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.definition !== undefined && { definition: input.definition }),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkflowOwner(ctx, input.id)
      // Executions + logs cascade via the schema's onDelete rules.
      await ctx.prisma.workflow.delete({ where: { id: input.id } })
      return { success: true }
    }),

  getExecution: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const execution = await ctx.prisma.workflowExecution.findUnique({
        where: { id: input.id },
        include: {
          logs: { orderBy: { createdAt: 'asc' } },
          workflow: { select: { userId: true } },
        },
      })
      if (!execution) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Execution not found' })
      }
      if (execution.workflow.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your workflow' })
      }
      return execution
    }),

  listExecutions: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertWorkflowOwner(ctx, input.workflowId)
      return ctx.prisma.workflowExecution.findMany({
        where: { workflowId: input.workflowId },
        orderBy: { createdAt: 'desc' },
      })
    }),
})
