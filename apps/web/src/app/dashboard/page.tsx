'use client'

import dynamic from 'next/dynamic'
import DashboardLoading from './loading'

const DashboardContent = dynamic(() => import('./_components/dashboard-content'), {
  loading: () => <DashboardLoading />,
  ssr: false,
})

export default function DashboardPage() {
  return <DashboardContent />
}
