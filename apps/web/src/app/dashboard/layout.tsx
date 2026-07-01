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
    <div className="flex h-screen">
      <Sidebar>
        <DashboardNav />
      </Sidebar>
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {children}
      </main>
    </div>
  )
}
