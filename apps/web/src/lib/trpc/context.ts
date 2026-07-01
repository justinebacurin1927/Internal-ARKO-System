import { auth } from '../auth'
import { prisma } from '@arko/db'

export async function createTRPCContext() {
  const session = await auth()

  return {
    prisma,
    session,
    user: session?.user,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
