import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { type TRPCContext } from '../../lib/trpc/context'
import { hasRole } from '../../lib/rbac'

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      user: ctx.session.user,
      userRole: ctx.userRole,
    },
  })
})

export const protectedProcedure = t.procedure.use(enforceAuth)

/**
 * Require the authenticated user to have one of the given roles.
 * Usage: requireRole(['ADMIN']) or requireRole(['ADMIN', 'MEMBER'])
 */
export function requireRole(allowedRoles: string[]) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    if (!hasRole(ctx.userRole as any, allowedRoles as any)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      })
    }
    return next({
      ctx: {
        user: ctx.session.user,
        userRole: ctx.userRole,
      },
    })
  })
}

/**
 * Verify that the authenticated user owns a specific resource.
 * `getOwnerId` extracts the owner's userId from the input.
 */
export function requireOwnership(getOwnerId: (input: unknown) => string | undefined | null) {
  return t.middleware(({ ctx, next, input }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    // ADMIN can bypass ownership checks
    if (ctx.userRole === 'ADMIN') {
      return next({ ctx: { user: ctx.session.user, userRole: ctx.userRole } })
    }
    const ownerId = getOwnerId(input)
    if (!ownerId || ownerId !== ctx.session.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not own this resource',
      })
    }
    return next({
      ctx: {
        user: ctx.session.user,
        userRole: ctx.userRole,
      },
    })
  })
}
