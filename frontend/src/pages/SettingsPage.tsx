import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'
import { Card, CardContent } from '../components/Card'
import { Button } from '../components/Button'
import { User, Lock, Loader2, AlertCircle } from 'lucide-react'

export default function SettingsPage() {
  const { user, token } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  const handleSaveProfile = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.updateProfile({ name: name.trim() })
      await refreshUser()
      toast('Profile updated')
    } catch (err: any) {
      toast(err.message || 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters')
      return
    }
    setChangingPw(true)
    try {
      await api.changePassword(oldPassword, newPassword)
      setPwSuccess('Password changed successfully')
      setOldPassword('')
      setNewPassword('')
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password')
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div className="h-full flex flex-col gap-3 max-w-2xl">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Settings</h1>
        <p className="text-sm text-text-tertiary mt-1">Manage your account</p>
      </div>

      {/* Profile section */}
      <Card className="overflow-hidden shrink-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-black/[0.06]">
              <User className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Profile</h2>
              <p className="text-xs text-text-tertiary">Your name and account details</p>
            </div>
          </div>

          <div className="space-y-4 max-w-sm">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Email</label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="block w-full rounded-lg border border-border-subtle bg-bg-app px-3 py-2.5 text-sm text-text-secondary cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-text-tertiary">Email cannot be changed</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Display name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 rounded-lg border border-border-subtle px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                />
                <Button onClick={handleSaveProfile} disabled={saving || !name.trim()}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving</> : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password section */}
      <Card className="overflow-hidden shrink-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-black/[0.06]">
              <Lock className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Password</h2>
              <p className="text-xs text-text-tertiary">Change your password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            {pwError && (
              <div className="flex items-center gap-2 rounded-lg border border-neg/30 bg-neg-bg p-3 text-sm text-neg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="rounded-lg border border-pos/30 bg-pos-bg p-3 text-sm text-pos">
                {pwSuccess}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Current password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="block w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="block w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
              />
            </div>
            <Button type="submit" disabled={changingPw || !oldPassword || !newPassword}>
              {changingPw ? <><Loader2 className="h-4 w-4 animate-spin" /> Changing…</> : 'Change password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
