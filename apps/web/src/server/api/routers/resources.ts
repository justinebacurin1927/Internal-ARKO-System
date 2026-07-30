import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, requireRole } from '../trpc'

const TYPE = ['LINK', 'FILE', 'DOC'] as const

/** A resource/category is readable if it's public OR owned by the current user. */
function visibleTo(userId: string) {
  return { OR: [{ isPublic: true }, { userId }] }
}

/** Load a resource and assert the caller may manage it (creator or ADMIN). */
async function manageableResource(ctx: any, id: string) {
  const row = await ctx.prisma.resource.findUnique({ where: { id } })
  if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
  if (row.userId !== ctx.user.id && ctx.userRole !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return row
}

/** Load a category and assert the caller may manage it (creator or ADMIN). */
async function manageableCategory(ctx: any, id: string) {
  const row = await ctx.prisma.resourceCategory.findUnique({ where: { id } })
  if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
  if (row.userId !== ctx.user.id && ctx.userRole !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return row
}

export const resourcesRouter = router({
  /** Paginated, searchable list of resources the caller can see (public or own). */
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          search: z.string().trim().optional(),
          categoryId: z.string().optional(),
        })
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      const isAdmin = ctx.userRole === 'ADMIN'

      const and: any[] = [visibleTo(userId)]
      if (input.categoryId) and.push({ categoryId: input.categoryId })
      if (input.search) {
        and.push({
          OR: [
            { title: { contains: input.search, mode: 'insensitive' } },
            { description: { contains: input.search, mode: 'insensitive' } },
            { tags: { has: input.search } },
          ],
        })
      }
      const where = { AND: and }

      const [rows, total] = await Promise.all([
        ctx.prisma.resource.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: {
            category: true,
            user: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.resource.count({ where }),
      ])

      return {
        items: rows.map((r: any) => ({
          ...r,
          ownerName: r.user?.name ?? null,
          canManage: r.userId === userId || isAdmin,
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
      }
    }),

  create: protectedProcedure
    .use(requireRole(['ADMIN', 'MEMBER', 'USER']))
    .input(
      z.object({
        title: z.string().min(1).max(255),
        url: z.string().url().optional(),
        resourceType: z.enum(TYPE).default('LINK'),
        description: z.string().optional(),
        tags: z.array(z.string()).default([]),
        fileId: z.string().optional(),
        categoryId: z.string().optional(),
        isPublic: z.boolean().default(true),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.resource.create({ data: { ...input, userId: ctx.user.id! } }),
    ),

  update: protectedProcedure
    .use(requireRole(['ADMIN', 'MEMBER', 'USER']))
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        url: z.string().url().optional(),
        resourceType: z.enum(TYPE).optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        fileId: z.string().optional(),
        categoryId: z.string().optional().nullable(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await manageableResource(ctx, input.id)
      const { id, ...data } = input
      return ctx.prisma.resource.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .use(requireRole(['ADMIN', 'MEMBER', 'USER']))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await manageableResource(ctx, input.id)
      return ctx.prisma.resource.delete({ where: { id: input.id } })
    }),

  // ── Category (box) procedures ──

  listCategories: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id!
    const isAdmin = ctx.userRole === 'ADMIN'
    const rows = await ctx.prisma.resourceCategory.findMany({
      where: visibleTo(userId),
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { resources: { where: visibleTo(userId) } } },
      },
    })
    return rows.map((c: any) => ({
      ...c,
      count: c._count?.resources ?? 0,
      canManage: c.userId === userId || isAdmin,
    }))
  }),

  createCategory: protectedProcedure
    .use(requireRole(['ADMIN', 'MEMBER', 'USER']))
    .input(
      z.object({
        name: z.string().min(1).max(100),
        icon: z.string().default('Folder'),
        isPublic: z.boolean().default(true),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.resourceCategory.create({
        data: { ...input, userId: ctx.user.id! },
      }),
    ),

  updateCategory: protectedProcedure
    .use(requireRole(['ADMIN', 'MEMBER', 'USER']))
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        icon: z.string().optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await manageableCategory(ctx, input.id)
      const { id, ...data } = input
      return ctx.prisma.resourceCategory.update({ where: { id }, data })
    }),

  deleteCategory: protectedProcedure
    .use(requireRole(['ADMIN', 'MEMBER', 'USER']))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await manageableCategory(ctx, input.id)
      return ctx.prisma.resourceCategory.delete({ where: { id: input.id } })
    }),
})
