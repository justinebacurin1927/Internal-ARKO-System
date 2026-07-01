import { Card, CardContent, CardHeader, CardTitle } from '@arko/ui'
import { Wallet, Workflow, CheckSquare, ArrowUpRight } from 'lucide-react'

const stats = [
  {
    title: 'Cash Balance',
    value: '₱0.00',
    change: '+₱0.00',
    icon: Wallet,
    color: 'text-finance-500',
    bg: 'bg-finance-50',
  },
  {
    title: 'Active Workflows',
    value: '0',
    change: '0 running',
    icon: Workflow,
    color: 'text-workflow-500',
    bg: 'bg-amber-50',
  },
  {
    title: 'Open Tasks',
    value: '0',
    change: '0 due today',
    icon: CheckSquare,
    color: 'text-task-500',
    bg: 'bg-purple-50',
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome to Arko — your startup OS</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <ArrowUpRight className="h-3 w-3 text-green-500" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 text-center py-8">
              No transactions yet. Add your first one to get started.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 text-center py-8">
              No tasks yet. Create your first task to start tracking work.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
