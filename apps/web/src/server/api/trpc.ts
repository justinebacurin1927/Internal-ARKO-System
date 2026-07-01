import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { type TRPCContext } from '../../lib/trpc/context'

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
    },
  })
})

export const protectedProcedure = t.procedure.use(enforceAuth)
