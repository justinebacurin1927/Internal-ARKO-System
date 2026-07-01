import { Sidebar } from '@arko/ui'
import { DashboardNav } from './nav'
import { DashboardHeader } from './_components/dashboard-header'
import { auth } from '../../lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/auth/login')

  return (
    <div className="flex h-screen overflow-hidden w-full">
      <Sidebar>
        <DashboardNav />
      </Sidebar>
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-hidden bg-surface p-4 lg:p-8">
          <div className="h-full w-full animate-[fade-in_0.15s_ease-out]">{children}</div>
        </main>
      </div>
    </div>
  )
}
