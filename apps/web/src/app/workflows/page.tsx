'use client'

import { Card, CardContent, CardHeader, CardTitle, Button } from '@arko/ui'
import { Plus, Workflow } from 'lucide-react'

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-sm text-gray-500 mt-1">Automate your business processes</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New Workflow
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary-200 cursor-pointer transition-colors">
          <CardHeader>
            <div className="rounded-lg bg-workflow-50 p-3 w-fit mb-2">
              <Workflow className="h-6 w-6 text-workflow-500" />
            </div>
            <CardTitle className="text-base">Expense Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Multi-step approval workflow for expense reports
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                Template
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary-200 cursor-pointer transition-colors">
          <CardHeader>
            <div className="rounded-lg bg-workflow-50 p-3 w-fit mb-2">
              <Workflow className="h-6 w-6 text-workflow-500" />
            </div>
            <CardTitle className="text-base">Invoice Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Automated invoice capture, validation, and payment
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                Template
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary-200 cursor-pointer transition-colors">
          <CardHeader>
            <div className="rounded-lg bg-workflow-50 p-3 w-fit mb-2">
              <Workflow className="h-6 w-6 text-workflow-500" />
            </div>
            <CardTitle className="text-base">Onboarding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              New member onboarding with task assignments
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                Template
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
