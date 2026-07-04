import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import ConfirmDialog from '../components/ConfirmDialog'
import {
  Plus, Pencil, Trash2, Search, Shield, UserCog, Clock,
  Mail, Phone, Briefcase, BadgeCheck, XCircle,
  AlertCircle, ChevronDown, X, RotateCcw, Users,
} from 'lucide-react'

/* ─── Shared input classes ─── */
const inputBase = [
  'block w-full rounded-xl border border-border-subtle bg-white text-text-primary placeholder:text-text-tertiary',
  'focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/8',
  'transition-all duration-150 hover:border-accent-300',
  'disabled:bg-bg-app disabled:text-text-tertiary disabled:cursor-not-allowed',
].join(' ')

const selectBase = [
  inputBase,
  'appearance-none cursor-pointer',
  '[&>option]:text-text-primary [&>option]:bg-white',
].join(' ')

/* ─── Role/Status styles ─── */
const roleStyles: Record<string, string> = {
  ADMIN: 'bg-accent-100 text-accent-700 ring-accent-300',
  MEMBER: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  USER: 'bg-stone-100 text-stone-600 ring-stone-200',
}


export default function UserManagementPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formRole, setFormRole] = useState('USER')
  const [formStatus, setFormStatus] = useState('ACTIVE')
  const [formVerificationId, setFormVerificationId] = useState('')

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.adminListUsers(),
  })

  const createUser = useMutation({
    mutationFn: () => api.adminCreateUser({
      name: formName, email: formEmail, password: formPassword,
      phone: formPhone, title: formTitle, role: formRole, status: formStatus,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      resetForm()
      toast('User created')
    },
  })

  const updateUser = useMutation({
    mutationFn: () => api.adminUpdateUser(editingUser!.id, {
      name: formName, email: formEmail, phone: formPhone,
      title: formTitle, role: formRole, status: formStatus,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      resetForm()
      toast('User updated')
    },
  })

  const deleteUser = useMutation({
    mutationFn: (id: number) => api.adminDeleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast('User deleted')
    },
  })

  const resetForm = () => {
    setFormName(''); setFormEmail(''); setFormPassword('')
    setFormPhone(''); setFormTitle(''); setFormRole('USER')
    setFormStatus('ACTIVE'); setFormVerificationId('')
    setEditingUser(null); setFormOpen(false)
  }

  const openCreate = () => {
    resetForm()
    setFormOpen(true)
    setFormRole('USER')
    setFormStatus('ACTIVE')
  }

  const openEdit = (u: any) => {
    setEditingUser(u)
    setFormName(u.name || '')
    setFormEmail(u.email || '')
    setFormPassword('')
    setFormPhone(u.phone || '')
    setFormTitle(u.title || '')
    setFormRole(u.role || 'USER')
    setFormStatus(u.status || 'ACTIVE')
    setFormVerificationId('')
    setFormOpen(true)
  }

  const submitDisabled =
    !formEmail || (!editingUser && !formPassword) || createUser.isPending || updateUser.isPending

  const filtered = (users ?? []).filter((u: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.title?.toLowerCase().includes(q)
  })

  const isAdmin = currentUser?.role === 'ADMIN'

  if (!isAdmin) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <Shield className="h-6 w-6 text-amber-500" />
        </div>
        <p className="text-sm font-medium text-text-primary">Admin access required</p>
        <p className="text-xs text-text-tertiary">Only administrators can manage users.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <p className="text-sm font-medium text-text-primary">Failed to load users</p>
        <p className="text-xs text-text-tertiary max-w-xs">{(error as any)?.message || 'An unknown error occurred'}</p>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
          className="text-xs font-medium text-accent-600 hover:text-accent-500 cursor-pointer">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-bg-app
      [&::-webkit-scrollbar]:w-1.5
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-thumb]:bg-accent-200
      [&::-webkit-scrollbar-track]:bg-transparent">

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-sm font-bold text-text-primary" style={{ fontFamily: "'Playfair Display', serif }} Display', serif" }}>
            User Management
          </h1>
          <span className="rounded-full bg-accent-50 px-2 py-[2px] text-[9px] font-medium text-accent-600 ring-1 ring-accent-200">
            Admin
          </span>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-3.5 py-2 text-xs font-semibold text-white transition-all duration-150 hover:bg-accent-500 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
        >
          <Plus className="h-3.5 w-3.5" />
          Create User
        </button>
      </div>

      {/* Error/success states handled inline */}

      {/* Create/Edit form */}
      {formOpen && (
        <div className="shrink-0 rounded-xl border border-accent-200 bg-white p-2.5 shadow-sm mb-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-accent-50">
              {editingUser
                ? <Pencil className="h-3 w-3 text-accent-600" />
                : <Plus className="h-3 w-3 text-accent-600" />
              }
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-accent-700">
              {editingUser ? `Edit User: ${editingUser.name || editingUser.email}` : 'Create New User'}
            </span>
            <button onClick={resetForm} className="ml-auto flex h-5 w-5 items-center justify-center rounded-md text-text-tertiary hover:bg-accent-50 hover:text-text-primary transition-all cursor-pointer">
              <X className="h-3 w-3" />
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault()
            if (editingUser) {
              updateUser.mutate()
            } else {
              createUser.mutate()
            }
          }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-2 gap-y-2">
              {/* Name */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Full Name</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className={inputBase + ' px-3 py-2 text-[11px]'}
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Email *</label>
                <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                  required placeholder="user@example.com"
                  className={inputBase + ' px-3 py-2 text-[11px]'}
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">
                  {editingUser ? 'New Password (leave blank to keep)' : 'Password *'}
                </label>
                <input type="password" value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required={!editingUser} minLength={6}
                  placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                  className={inputBase + ' px-3 py-2 text-[11px]'}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Phone</label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary pointer-events-none transition-colors duration-150 group-focus-within:text-accent-500" />
                  <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+63 912 345 6789"
                    className={inputBase + ' pl-8 pr-3 py-2 text-[11px]'}
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Position / Title</label>
                <div className="relative group">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary pointer-events-none transition-colors duration-150 group-focus-within:text-accent-500" />
                  <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Software Engineer"
                    className={inputBase + ' pl-8 pr-3 py-2 text-[11px]'}
                  />
                </div>
              </div>

              {/* Verification ID (coming soon) */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3 text-text-tertiary" />
                  Verification ID
                  <span className="text-[8px] font-normal text-text-tertiary bg-accent-50 px-1.5 py-[1px] rounded-full">Coming soon</span>
                </label>
                <input type="text" value={formVerificationId} disabled
                  placeholder="Government ID or company ID"
                  className={inputBase + ' px-3 py-2 text-[11px] opacity-50'}
                />
              </div>

              {/* Role */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Role</label>
                <div className="relative group">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary pointer-events-none z-10 transition-colors duration-150 group-focus-within:text-accent-500" />
                  <select value={formRole} onChange={(e) => setFormRole(e.target.value)}
                    className={selectBase + ' pl-8 pr-8 py-2 text-[11px]'}>
                    <option value="USER">User</option>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary pointer-events-none" />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-text-secondary tracking-wide">Status</label>
                <div className="relative group">
                  <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary pointer-events-none z-10 transition-colors duration-150 group-focus-within:text-accent-500" />
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                    className={selectBase + ' pl-8 pr-8 py-2 text-[11px]'}>
                    <option value="ACTIVE">Active</option>
                    <option value="RESTRICTED">Restricted</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border-subtle">
              <button type="submit" disabled={submitDisabled}
                className={[
                  'flex-1 rounded-xl px-4 py-2 text-[11px] font-semibold text-white transition-all duration-150',
                  'bg-accent-600 hover:bg-accent-500 active:bg-accent-700 active:scale-[0.97]',
                  'disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-accent-600',
                ].join(' ')}
              >
                {(createUser.isPending || updateUser.isPending)
                  ? <span className="inline-flex items-center gap-1.5"><RotateCcw className="h-3 w-3 animate-spin" /> Saving…</span>
                  : editingUser ? 'Save Changes' : 'Create User'
                }
              </button>
              <button type="button" onClick={resetForm}
                className="rounded-xl border border-border-subtle px-4 py-2 text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-accent-50 transition-all duration-150">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-2.5 shrink-0">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name, email, phone, or title..."
          className={'w-full rounded-xl border border-border-subtle bg-white py-2.5 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-500/8 transition-all hover:border-accent-300'}
        />
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto min-h-0
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-accent-200
        [&::-webkit-scrollbar-track]:bg-transparent">

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-white p-3">
                <div className="h-7 w-7 animate-pulse rounded-full bg-accent-100" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-32 animate-pulse rounded bg-accent-100" />
                  <div className="h-2 w-24 animate-pulse rounded bg-accent-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 ring-1 ring-accent-200">
              <Users className="h-5 w-5 text-accent-500" />
            </div>
            <p className="text-sm font-medium text-text-primary">
              {search ? 'No users match your search' : 'No users yet'}
            </p>
            {!search && (
              <p className="mt-1 text-[11px] text-text-secondary">
                Click <span className="text-accent-600 font-medium">Create User</span> to add one
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((u: any) => {
              const isCurrentUser = currentUser?.id === u.id
              const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
              return (
                <div key={u.id}
                  className={[
                    'group/user flex items-center justify-between rounded-xl border bg-white px-3 py-2.5 transition-all duration-100',
                    isCurrentUser ? 'border-accent-300 ring-1 ring-accent-200/30' : 'border-border-subtle hover:border-accent-200',
                  ].join(' ')}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {/* Avatar */}
                    <div className={[
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      u.role === 'ADMIN' ? 'bg-accent-100 text-accent-700' :
                      u.role === 'MEMBER' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-stone-100 text-stone-600',
                    ].join(' ')}>
                      {(u.name || u.email || '?').charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-semibold text-text-primary">
                          {u.name || 'Unnamed'}
                        </p>
                        {isCurrentUser && (
                          <span className="inline-flex items-center rounded-full bg-accent-50 px-1.5 py-[1px] text-[8px] font-medium text-accent-600 ring-1 ring-accent-200">You</span>
                        )}
                        {u.status === 'SUSPENDED' && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-[1px] text-[8px] font-medium text-red-600 ring-1 ring-red-200">
                            <XCircle className="h-2.5 w-2.5" /> Suspended
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
                          <Mail className="h-2.5 w-2.5" />
                          {u.email}
                        </span>
                        {u.phone && (
                          <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
                            <Phone className="h-2.5 w-2.5" />
                            {u.phone}
                          </span>
                        )}
                        {u.title && (
                          <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
                            <Briefcase className="h-2.5 w-2.5" />
                            {u.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: role, status, actions */}
                  <div className="flex shrink-0 items-center gap-2.5">
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <span className={[
                        'inline-flex items-center rounded-full px-1.5 py-[1px] text-[9px] font-medium ring-1',
                        roleStyles[u.role] || 'bg-stone-100 text-stone-600 ring-stone-200',
                      ].join(' ')}>
                        {u.role}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] text-text-tertiary">
                        <Clock className="h-2.5 w-2.5" />
                        {joined}
                      </span>
                    </div>

                    {!isCurrentUser && (
                      <div className="flex opacity-0 group-hover/user:opacity-100 transition-all duration-150">
                        <button onClick={() => openEdit(u)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:text-accent-600 hover:bg-accent-50 transition-all cursor-pointer"
                          title="Edit user">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(u.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          title="Delete user">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete user?"
        message="This will permanently remove this user and all their data. This cannot be undone."
        onConfirm={() => { if (confirmDeleteId !== null) deleteUser.mutate(confirmDeleteId); setConfirmDeleteId(null) }}
        onCancel={() => setConfirmDeleteId(null)}
        loading={deleteUser.isPending}
      />
    </div>
  )
}
