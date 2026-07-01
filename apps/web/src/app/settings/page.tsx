import { Card, CardContent, CardHeader, CardTitle } from '@arko/ui'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and workspace settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">Profile settings coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}
