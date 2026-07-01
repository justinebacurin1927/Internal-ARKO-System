import { Card, CardContent, CardHeader, CardTitle } from '@arko/ui'
import { User, Bell, Shield } from 'lucide-react'

const sections = [
  { icon: User, title: 'Profile', description: 'Manage your personal information and preferences.' },
  { icon: Bell, title: 'Notifications', description: 'Configure how and when you receive alerts.' },
  { icon: Shield, title: 'Security', description: 'Password, sessions, and authentication settings.' },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and workspace settings</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 mb-1">
                  <Icon className="h-5 w-5 text-primary-600" />
                </div>
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{section.description}</p>
                <span className="mt-3 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">Coming soon</span>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
