import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { hash } from 'bcryptjs'
import { createHash } from 'crypto'
import { router, protectedProcedure, requireRole } from '../trpc'

// ── Helpers ─────────────────────────────────────────────

function slugifyName(firstName: string, lastName: string): string {
  return `${firstName}.${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
}

function generatePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const special = '!@#$%^&*'
  const all = upper + lower + digits + special

  // Guarantee at least one of each category
  const parts = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ]

  // Fill to 14 characters
  for (let i = parts.length; i < 14; i++) {
    parts.push(all[Math.floor(Math.random() * all.length)])
  }

  // Fisher-Yates shuffle
  for (let i = parts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[parts[i], parts[j]] = [parts[j], parts[i]]
  }

  return parts.join('')
}

function gravatarUrl(email: string): string {
  const hash = createHash('md5').update(email.toLowerCase().trim()).digest('hex')
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=256`
}

async function findAvailableEmail(
  prisma: any,
  baseSlug: string,
  domain: string,
): Promise<string> {
  const base = `${baseSlug}@${domain}`
  const existing = await prisma.user.findUnique({ where: { email: base }, select: { id: true } })
  if (!existing) return base

  for (let i = 1; i < 100; i++) {
    const candidate = `${baseSlug}${i}@${domain}`
    const taken = await prisma.user.findUnique({ where: { email: candidate }, select: { id: true } })
    if (!taken) return candidate
  }

  throw new TRPCError({ code: 'CONFLICT', message: 'Unable to generate a unique email address' })
}

// ── Router ───────────────────────────────────────────────

export const usersRouter = router({
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id!
      const search = input?.query?.trim() ?? ''

      const where = search
        ? {
            AND: [
              { id: { not: userId } },
              {
                OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  { email: { contains: search, mode: 'insensitive' as const } },
                ],
              },
            ],
          }
        : { id: { not: userId } }

      return ctx.prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, image: true, title: true },
        take: input?.limit ?? 20,
        orderBy: { name: 'asc' },
      })
    }),

  /** List all users — admin only */
  list: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(
      z.object({
        query: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const search = input?.query?.trim() ?? ''
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}

      return ctx.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          title: true,
          role: true,
          status: true,
          createdAt: true,
          _count: { select: { tasks: true, transactions: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  /** Create a user — admin only. Email and password auto-generate if omitted. */
  create: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Valid email is required').optional(),
        phone: z.string().optional(),
        title: z.string().optional(),
        password: z.string().optional(),
        role: z.enum(['ADMIN', 'MEMBER', 'USER']).default('MEMBER'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-generate email from name
      const nameParts = input.name.trim().split(/\s+/)
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join('.') || firstName
      const slug = slugifyName(firstName, lastName)
      const email = input.email || (await findAvailableEmail(ctx.prisma, slug, 'arko.app'))

      // Auto-generate password if not provided
      const plainPassword = input.password || generatePassword()
      const hashedPassword = await hash(plainPassword, 12)

      // Check existing email
      const existing = await ctx.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      })
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A user with this email already exists',
        })
      }

      // Auto-generate Gravatar profile picture
      const image = gravatarUrl(email)

      const user = await ctx.prisma.user.create({
        data: {
          name: input.name,
          email,
          phone: input.phone || null,
          title: input.title || null,
          password: hashedPassword,
          image,
          role: input.role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          title: true,
          image: true,
          role: true,
          status: true,
          createdAt: true,
        },
      })

      // Return the plaintext password so the admin can share it (only on create)
      return { ...user, generatedPassword: plainPassword }
    }),

  /** Update a user's profile (name, phone) — admin only */
  updateProfile: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(
      z.object({
        userId: z.string(),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      })
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      const data: Record<string, string> = {}
      if (input.name !== undefined) data.name = input.name
      if (input.phone !== undefined) data.phone = input.phone
      if (input.title !== undefined) data.title = input.title

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data,
        select: { id: true, name: true, phone: true, title: true, email: true, role: true, status: true, image: true },
      })
    }),

  /** Update a user's role — admin only */
  updateRole: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(['ADMIN', 'MEMBER', 'USER']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && input.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove your own admin role',
        })
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      })
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: { id: true, name: true, email: true, role: true },
      })
    }),

  /** Update a user's status (restrict/activate/suspend) — admin only */
  updateStatus: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(
      z.object({
        userId: z.string(),
        status: z.enum(['ACTIVE', 'RESTRICTED', 'SUSPENDED']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && input.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot restrict or suspend your own account',
        })
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      })
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { status: input.status },
        select: { id: true, name: true, email: true, status: true },
      })
    }),

  /** Delete a user — admin only */
  delete: protectedProcedure
    .use(requireRole(['ADMIN']))
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete your own account',
        })
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      })
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      await ctx.prisma.user.delete({ where: { id: input.userId } })
      return { success: true }
    }),
})
