'use client'

import { Card, CardContent, CardHeader, CardTitle, Button } from '@arko/ui'
import { Plus, Workflow, AlertCircle } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

export default function WorkflowsPage() {
  const { data: workflows, isLoading, error } = api.workflows.list.useQuery()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Workflows</h1>
          <p className="text-sm text-gray-500 mt-1">Automate your business processes</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-medium text-red-800">Failed to load workflows</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-5 w-32 rounded bg-gray-100 animate-pulse mt-3" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse mt-1.5" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflows && workflows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {workflows.map((wf) => (
            <Card key={wf.id}>
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-workflow-50">
                  <Workflow className="h-5 w-5 text-workflow-600" />
                </div>
                <CardTitle className="text-base mt-2">{wf.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {wf.description && <p className="text-sm text-gray-500">{wf.description}</p>}
                <span className={`mt-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  wf.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                  wf.status === 'PAUSED' ? 'bg-workflow-50 text-workflow-700' :
                  'bg-gray-50 text-gray-600'
                }`}>{wf.status}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {[{ name: 'Expense Approval', desc: 'Multi-step approval workflow for expense reports' },
            { name: 'Invoice Processing', desc: 'Automated invoice capture, validation, and payment' },
            { name: 'Onboarding', desc: 'New member onboarding with task assignments' }]
            .map((tmpl) => (
              <Card key={tmpl.name}>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-workflow-50">
                    <Workflow className="h-5 w-5 text-workflow-600" />
                  </div>
                  <CardTitle className="text-base mt-2">{tmpl.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{tmpl.desc}</p>
                  <span className="mt-3 inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">Template</span>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
