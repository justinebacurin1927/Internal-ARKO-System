import { auth } from '../auth'
import { prisma, type Role } from '@arko/db'

export async function createTRPCContext() {
  const session = await auth()

  // Fetch the user's role from DB (fresh on every request)
  let userRole: Role | undefined
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    userRole = dbUser?.role ?? undefined
  }

  return {
    prisma,
    session,
    user: session?.user,
    userRole,
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>
