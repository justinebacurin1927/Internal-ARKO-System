import { Sidebar } from '@arko/ui'
import { DashboardNav } from './nav'
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar>
        <DashboardNav />
      </Sidebar>
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-surface p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-[fade-in_0.3s_ease-out]">{children}</div>
        </main>
      </div>
    </div>
  )
}
