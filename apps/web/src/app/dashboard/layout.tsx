import { DashboardShell } from './_components/dashboard-shell'
import { auth } from '../../lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/auth/login')

  return <DashboardShell>{children}</DashboardShell>
}
