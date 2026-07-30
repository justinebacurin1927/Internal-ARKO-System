import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure, requireRole, router } from '../trpc'

const projectStatus = z.enum(['PLANNING', 'ACTIVE', 'REVIEW', 'COMPLETED', 'ON_HOLD'])
const requestStatus = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED'])

const projectInclude = {
  client: { select: { id: true, name: true, email: true } },
  owner: { select: { id: true, name: true, email: true } },
  updates: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
    include: { author: { select: { id: true, name: true } } },
  },
  requests: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
  },
}

async function manageableProject(ctx: any, projectId: string) {
  const project = await ctx.prisma.clientProject.findUnique({ where: { id: projectId } })
  if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
  if (ctx.userRole !== 'ADMIN' && project.ownerId !== ctx.user.id) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return project
}

export const clientPortalRouter = router({
  dashboard: protectedProcedure
    .use(requireRole(['ADMIN', 'MEMBER', 'CLIENT']))
    .query(({ ctx }) =>
      ctx.prisma.clientProject.findMany({
        where:
          ctx.userRole === 'CLIENT'
            ? { clientId: ctx.user.id! }
            : ctx.userRole === 'MEMBER'
              ? { ownerId: ctx.user.id! }
              : {},
        include: projectInclude,
        orderBy: { updatedAt: 'desc' },
      }),
    ),

  requests: protectedProcedure
    .use(requireRole(['ADMIN', 'MEMBER', 'CLIENT']))
    .query(({ ctx }) =>
      ctx.prisma.clientRequest.findMany({
        where:
          ctx.userRole === 'CLIENT'
            ? { clientId: ctx.user.id! }
            : ctx.userRole === 'MEMBER'
              ? { project: { ownerId: ctx.user.id! } }
              : {},
        include: {
          client: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true, ownerId: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
    ),

  createProject: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(
      z.object({
        name: z.string().trim().min(1).max(120),
        summary: z.string().trim().max(1000).optional(),
        clientId: z.string(),
        progress: z.number().int().min(0).max(100).default(0),
        status: projectStatus.default('PLANNING'),
        dueDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.user.findFirst({
        where: { id: input.clientId, role: 'CLIENT', status: 'ACTIVE' },
        select: { id: true },
      })
      if (!client) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Select an active client' })
      return ctx.prisma.clientProject.create({
        data: { ...input, ownerId: ctx.user.id! },
        include: projectInclude,
      })
    }),

  updateProject: protectedProcedure
    .use(requireRole(['ADMIN', 'MEMBER']))
    .input(
      z.object({
        id: z.string(),
        status: projectStatus.optional(),
        progress: z.number().int().min(0).max(100).optional(),
        summary: z.string().trim().max(1000).optional(),
        dueDate: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await manageableProject(ctx, input.id)
      const { id, ...data } = input
      return ctx.prisma.clientProject.update({ where: { id }, data })
    }),

  addUpdate: protectedProcedure
    .use(requireRole(['ADMIN', 'MEMBER']))
    .input(z.object({ projectId: z.string(), content: z.string().trim().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      await manageableProject(ctx, input.projectId)
      return ctx.prisma.clientUpdate.create({
        data: { ...input, authorId: ctx.user.id! },
      })
    }),

  createRequest: protectedProcedure
    .use(requireRole(['CLIENT']))
    .input(
      z.object({
        projectId: z.string().optional(),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(3000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.projectId) {
        const project = await ctx.prisma.clientProject.findFirst({
          where: { id: input.projectId, clientId: ctx.user.id! },
          select: { id: true },
        })
        if (!project) throw new TRPCError({ code: 'FORBIDDEN' })
      }
      return ctx.prisma.clientRequest.create({
        data: { ...input, clientId: ctx.user.id! },
      })
    }),

  updateRequest: protectedProcedure
    .use(requireRole(['ADMIN', 'MEMBER']))
    .input(z.object({ id: z.string(), status: requestStatus }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.clientRequest.findUnique({
        where: { id: input.id },
        include: { project: { select: { ownerId: true } } },
      })
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' })
      if (ctx.userRole !== 'ADMIN' && request.project?.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      return ctx.prisma.clientRequest.update({
        where: { id: input.id },
        data: { status: input.status },
      })
    }),
})
