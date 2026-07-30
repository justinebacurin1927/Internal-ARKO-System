'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@arko/ui'
import { PerformanceChart } from '../_components/performance-chart'

type AnalyticsTransaction = {
  id: string
  amount: number
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  date: Date | string
  category?: { name: string } | null
}

export function AnalyticsCharts({ transactions }: { transactions: AnalyticsTransaction[] }) {
  const data = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {}
    const now = new Date()
    for (let index = 5; index >= 0; index--) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
      months[date.toLocaleDateString('en-US', { month: 'short' })] = { income: 0, expenses: 0 }
    }
    for (const transaction of transactions) {
      const month = new Date(transaction.date).toLocaleDateString('en-US', { month: 'short' })
      if (!months[month]) continue
      if (transaction.type === 'INCOME') months[month].income += transaction.amount
      if (transaction.type === 'EXPENSE') months[month].expenses += transaction.amount
    }
    return {
      labels: Object.keys(months),
      income: Object.values(months).map((month) => month.income),
      expenses: Object.values(months).map((month) => month.expenses),
    }
  }, [transactions])

  const expensePoints = transactions
    .filter((transaction) => transaction.type === 'EXPENSE')
    .slice(0, 42)
  const maxExpense = Math.max(...expensePoints.map((transaction) => transaction.amount), 1)
  const categories = [...new Set(expensePoints.map((transaction) => transaction.category?.name ?? 'Other'))].slice(0, 4)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="analytics-panel flex h-[300px] flex-col overflow-hidden">
        <CardHeader className="flex-row items-start justify-between p-5 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <p className="mt-1 text-xs text-text-tertiary">Spending distribution by category</p>
          </div>
          <div className="hidden max-w-[60%] flex-wrap justify-end gap-2 text-[10px] text-text-tertiary sm:flex">
            {categories.map((category, index) => (
              <span key={category} className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${['bg-primary-700', 'bg-primary-500', 'bg-primary-300', 'bg-gray-500'][index]}`} />
                {category}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-5 pt-0">
          {expensePoints.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-text-tertiary">No expense activity yet</div>
          ) : (
            <svg viewBox="0 0 520 210" className="h-full w-full" role="img" aria-label="Expense distribution chart">
              {[25, 75, 125, 175].map((y) => <line key={y} x1="36" y1={y} x2="510" y2={y} stroke="currentColor" className="text-white/[0.06]" />)}
              <line x1="48" y1="180" x2="490" y2="24" stroke="currentColor" strokeDasharray="5 5" className="text-primary-500/60" />
              {expensePoints.map((transaction, index) => {
                const categoryIndex = Math.max(0, categories.indexOf(transaction.category?.name ?? 'Other'))
                const x = 48 + (index / Math.max(expensePoints.length - 1, 1)) * 440
                const y = 184 - (transaction.amount / maxExpense) * 150
                return (
                  <circle
                    key={transaction.id}
                    cx={x}
                    cy={y}
                    r="4"
                    className={['fill-primary-700', 'fill-primary-500', 'fill-primary-300', 'fill-gray-500'][categoryIndex]}
                  >
                    <title>{transaction.category?.name ?? 'Other'}: {transaction.amount.toLocaleString()}</title>
                  </circle>
                )
              })}
              {data.labels.map((label, index) => (
                <text key={label} x={48 + (index / 5) * 440} y="205" textAnchor="middle" className="fill-text-tertiary text-[10px]">{label}</text>
              ))}
            </svg>
          )}
        </CardContent>
      </Card>

      <Card className="analytics-panel flex h-[300px] flex-col overflow-hidden">
        <CardHeader className="flex-row items-start justify-between p-5 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Financial activity</CardTitle>
            <p className="mt-1 text-xs text-text-tertiary">Income and expense movement</p>
          </div>
          <div className="flex gap-3 text-[10px] text-text-tertiary">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary-500" />Income</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" />Expenses</span>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-4 pt-0">
          <PerformanceChart incomeData={data.income} expenseData={data.expenses} labels={data.labels} />
        </CardContent>
      </Card>
    </div>
  )
}
