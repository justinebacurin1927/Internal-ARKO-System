'use client'

import { Card, CardContent, CardHeader, CardTitle, Button } from '@arko/ui'
import { Plus, ListTodo } from 'lucide-react'

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your tasks and projects</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {['To Do', 'In Progress', 'Review', 'Done'].map((column) => (
          <Card key={column}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{column}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                <ListTodo className="h-8 w-8 mb-2" />
                <p className="text-xs">No tasks</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
