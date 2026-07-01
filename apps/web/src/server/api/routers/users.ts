import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

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
        select: { id: true, name: true, email: true, image: true },
        take: input?.limit ?? 20,
        orderBy: { name: 'asc' },
      })
    }),
})
