'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { api } from '../../../lib/trpc/client'
import dynamic from 'next/dynamic'
import type { AvatarConfigJson } from '../../../lib/avatar'

const OpenPeepsAvatar = dynamic(() =>
  import('../../../components/open-peeps-avatar').then((m) => ({ default: m.OpenPeepsAvatar })),
  { ssr: false },
)

const OpenPeepsPicker = dynamic(() =>
  import('../../../components/open-peeps-picker').then((m) => ({ default: m.OpenPeepsPicker })),
  { ssr: false },
)

// ── Types ───────────────────────────────────────────────

type Status = 'idle' | 'saving' | 'success' | 'error'

interface FormStatus {
  status: Status
  message?: string
}

// ── Section Card ────────────────────────────────────────

function SectionCard({
  title,
  description,
  children,
  noPadding,
}: {
  title: string
  description: string
  children: React.ReactNode
  noPadding?: boolean
}) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-card p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <p className="text-sm text-text-tertiary mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  )
}

// ── Status Banner ───────────────────────────────────────

function StatusBanner({ status }: { status: FormStatus | null }) {
  if (!status || status.status === 'idle' || status.status === 'saving') return null

  const isSuccess = status.status === 'success'
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
        isSuccess
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      {isSuccess ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      <span>{status.message}</span>
    </div>
  )
}

// ── Profile Form ────────────────────────────────────────

function ProfileForm() {
  const utils = api.useUtils()
  const { data: session, update } = useSession()
  const { data: profile, isLoading } = api.users.getProfile.useQuery()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [image, setImage] = useState('')
  const [avatar, setAvatar] = useState<AvatarConfigJson | null>(null)
  const [status, setStatus] = useState<FormStatus | null>(null)

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setPhone(profile.phone ?? '')
      setTitle(profile.title ?? '')
      setImage(profile.image ?? '')
    }
  }, [profile])

  const updateProfile = api.users.updateProfile.useMutation({
    onSuccess: () => {
      setStatus({ status: 'success', message: 'Profile updated successfully' })
      utils.users.getProfile.invalidate()
      update()
    },
    onError: (e) => {
      setStatus({ status: 'error', message: e.message })
    },
  })

  const handleSave = () => {
    setStatus({ status: 'saving' })
    updateProfile.mutate({
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      title: title.trim() || undefined,
      image: image.trim() || null,
      avatar: avatar ?? undefined,
    })
  }

  if (isLoading) {
    return (
      <SectionCard title="Profile" description="Manage your personal information and avatar.">
        <div className="flex items-center gap-2 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading profile…
        </div>
      </SectionCard>
    )
  }

  const changed =
    (name !== (profile?.name ?? '')) ||
    (phone !== (profile?.phone ?? '')) ||
    (title !== (profile?.title ?? '')) ||
    (image !== (profile?.image ?? '')) ||
    avatar !== null

  const sessionAvatar = session?.user && 'avatar' in session.user
    ? (session.user as any).avatar as string | undefined
    : undefined

  const storedAvatar = profile?.avatar ? (profile.avatar as unknown as AvatarConfigJson) : null

  return (
    <SectionCard title="Profile" description="Manage your personal information and avatar.">
      <StatusBanner status={status} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
        {/* Left column: form fields */}
        <div className="space-y-4 min-w-0">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <input
              value={profile?.email ?? ''}
              disabled
              className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-text-tertiary cursor-not-allowed"
            />
            <p className="mt-0.5 text-[11px] text-text-tertiary">Email cannot be changed</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
                placeholder="+1 555-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
                placeholder="Software Engineer"
              />
            </div>
          </div>

          {/* Profile photo URL */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Profile photo URL</label>
            <div className="flex gap-2">
              <input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
              />
              {image && (
                <button
                  onClick={() => setImage('')}
                  className="shrink-0 rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-tertiary hover:bg-card transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-text-tertiary">Paste a link to your profile picture. Overlays on top of your avatar.</p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={!changed || status?.status === 'saving'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {status?.status === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </div>

        {/* Right column: avatar preview + picker */}
        <div className="shrink-0 lg:border-l lg:border-border-subtle lg:pl-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <OpenPeepsAvatar
                userId={profile?.id}
                avatarJson={storedAvatar ? JSON.stringify(storedAvatar) : undefined}
                config={avatar ?? undefined}
                size={100}
              />
              {image && (
                <img
                  src={image}
                  alt=""
                  className="absolute inset-0 h-full w-full rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {!avatar && storedAvatar && (
                <button
                  onClick={() => setAvatar(null)}
                  className="text-xs text-accent-600 hover:text-accent-700 transition-colors"
                >
                  Reset avatar
                </button>
              )}
            </div>
            <div className="min-w-[320px]">
              <OpenPeepsPicker
                currentAvatar={avatar ?? storedAvatar ?? undefined}
                onChange={setAvatar}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

// ── Password Change Form ────────────────────────────────

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<FormStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const changePassword = api.users.changePassword.useMutation({
    onSuccess: () => {
      setStatus({ status: 'success', message: 'Password changed successfully' })
      setCurrent('')
      setNewPw('')
      setConfirm('')
    },
    onError: (e) => {
      setStatus({ status: 'error', message: e.message })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPw.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPw !== confirm) {
      setError('Passwords do not match')
      return
    }

    setStatus({ status: 'saving' })
    changePassword.mutate({ currentPassword: current, newPassword: newPw })
  }

  return (
    <SectionCard title="Security" description="Update your password.">
      <StatusBanner status={status} />

      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Current password</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">New password</label>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
          />
          <p className="mt-0.5 text-[11px] text-text-tertiary">Minimum 8 characters</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={!current || !newPw || !confirm || status?.status === 'saving'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {status?.status === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
            Change password
          </button>
        </div>
      </form>
    </SectionCard>
  )
}

// ── Notifications Form (deferred) ───────────────────────

function NotificationsForm() {
  return (
    <SectionCard title="Notifications" description="Configure how and when you receive alerts.">
      <p className="text-sm text-text-tertiary italic">Notification preferences coming soon</p>
    </SectionCard>
  )
}

// ── Page ────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Settings</h1>
        <p className="text-sm text-text-tertiary mt-1">Manage your account and workspace settings</p>
      </div>

      <ProfileForm />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NotificationsForm />
        <PasswordForm />
      </div>
    </div>
  )
}
