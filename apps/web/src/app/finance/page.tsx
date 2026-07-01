'use client'

import { Card, CardContent, CardHeader, CardTitle, Button } from '@arko/ui'
import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500 mt-1">Track your income, expenses, and cashflow</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₱0.00</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-600">₱0.00</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold text-red-600">₱0.00</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 text-center py-12">
            No transactions recorded yet. Click &ldquo;Add Transaction&rdquo; to begin tracking your finances.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
