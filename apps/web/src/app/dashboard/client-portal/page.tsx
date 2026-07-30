'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button, Card, CardContent } from '@arko/ui'
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Settings,
} from 'lucide-react'
import { api } from '../../../lib/trpc/client'

const OpenPeepsAvatar = dynamic(
  () => import('../../../components/open-peeps-avatar').then((module) => ({
    default: module.OpenPeepsAvatar,
  })),
  { ssr: false },
)

const quickLinks = [
  {
    href: '/dashboard/messages',
    title: 'Messages',
    description: 'Talk directly with the ARKO team.',
    icon: MessageSquare,
  },
  {
    href: '/dashboard/resources',
    title: 'Shared resources',
    description: 'Open documents and links shared with you.',
    icon: FileText,
  },
  {
    href: '/dashboard/settings',
    title: 'Profile settings',
    description: 'Update your contact details and avatar.',
    icon: Settings,
  },
]

export default function ClientPortalPage() {
  const { data: session } = useSession()
  const isClient = session?.user?.role === 'CLIENT'
  const isAdmin = session?.user?.role === 'ADMIN'
  const [requestTitle, setRequestTitle] = useState('')
  const [requestDescription, setRequestDescription] = useState('')
  const [requestProjectId, setRequestProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectClientId, setProjectClientId] = useState('')
  const [projectSummary, setProjectSummary] = useState('')
  const [updateDrafts, setUpdateDrafts] = useState<Record<string, string>>({})
  const { data: profile, isLoading } = api.users.getProfile.useQuery()
  const { data: unreadMessages } = api.messages.unreadCount.useQuery(undefined, {
    refetchInterval: 10000,
  })
  const { data: resources } = api.resources.list.useQuery({
    page: 1,
    pageSize: 5,
  })
  const { data: projects } = api.clientPortal.dashboard.useQuery()
  const { data: requests } = api.clientPortal.requests.useQuery()
  const { data: users } = api.users.list.useQuery(undefined, { enabled: isAdmin })
  const utils = api.useUtils()
  const clients = users?.filter((user) => user.role === 'CLIENT') ?? []
  const createRequest = api.clientPortal.createRequest.useMutation({
    onSuccess: () => {
      setRequestTitle('')
      setRequestDescription('')
      setRequestProjectId('')
      utils.clientPortal.dashboard.invalidate()
      utils.clientPortal.requests.invalidate()
    },
  })
  const createProject = api.clientPortal.createProject.useMutation({
    onSuccess: () => {
      setProjectName('')
      setProjectClientId('')
      setProjectSummary('')
      utils.clientPortal.dashboard.invalidate()
    },
  })
  const updateProject = api.clientPortal.updateProject.useMutation({
    onSuccess: () => utils.clientPortal.dashboard.invalidate(),
  })
  const updateRequest = api.clientPortal.updateRequest.useMutation({
    onSuccess: () => {
      utils.clientPortal.dashboard.invalidate()
      utils.clientPortal.requests.invalidate()
    },
  })
  const addUpdate = api.clientPortal.addUpdate.useMutation({
    onSuccess: (_, input) => {
      setUpdateDrafts((current) => ({ ...current, [input.projectId]: '' }))
      utils.clientPortal.dashboard.invalidate()
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border-subtle bg-card">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-500/10">
            <OpenPeepsAvatar
              userId={profile?.id}
              userName={profile?.name ?? undefined}
              avatarJson={profile?.avatar ? JSON.stringify(profile.avatar) : undefined}
              size={56}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-primary-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-400">
                Client Portal
              </span>
            </div>
            <h1 className="truncate text-2xl font-bold tracking-tight text-text-primary">
              Welcome, {profile?.name ?? 'Client'}
            </h1>
            <p className="mt-1 text-sm text-text-tertiary">
              Your secure space for conversations and shared project resources.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Active projects
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-text-primary">
              {projects?.filter((project) => project.status !== 'COMPLETED').length ?? 0}
            </p>
            <p className="mt-4 text-sm text-text-tertiary">Connected to your ARKO project team</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Unread messages
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-text-primary">
              {unreadMessages ?? 0}
            </p>
            <Link
              href="/dashboard/messages"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-400 hover:text-primary-300"
            >
              Open messages <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              Available resources
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-text-primary">
              {resources?.total ?? 0}
            </p>
            <Link
              href="/dashboard/resources"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-400 hover:text-primary-300"
            >
              View resources <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <section className="rounded-2xl border border-border-subtle bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary-400" />
            <h2 className="text-base font-semibold text-text-primary">Connect a client project</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Project name"
              className="rounded-lg border border-border-subtle bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
            />
            <select
              value={projectClientId}
              onChange={(event) => setProjectClientId(event.target.value)}
              className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name ?? client.email}</option>
              ))}
            </select>
            <input
              value={projectSummary}
              onChange={(event) => setProjectSummary(event.target.value)}
              placeholder="Short project summary"
              className="rounded-lg border border-border-subtle bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
            />
          </div>
          <Button
            size="sm"
            className="mt-3"
            disabled={!projectName.trim() || !projectClientId || createProject.isPending}
            onClick={() => createProject.mutate({
              name: projectName.trim(),
              clientId: projectClientId,
              summary: projectSummary.trim() || undefined,
            })}
          >
            {createProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create project
          </Button>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary-400" />
          <h2 className="text-base font-semibold text-text-primary">Projects and progress</h2>
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {projects?.length ? projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-text-primary">{project.name}</h3>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {isClient ? `Managed by ${project.owner.name ?? project.owner.email}` : `Client: ${project.client.name ?? project.client.email}`}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-500/10 px-2 py-1 text-[10px] font-semibold text-primary-400">
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                {project.summary && <p className="mt-3 text-sm leading-6 text-text-secondary">{project.summary}</p>}
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-text-tertiary">Progress</span>
                    <span className="font-semibold tabular-nums text-text-primary">{project.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-app">
                    <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
                {isAdmin && (
                  <div className="mt-4 space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue={project.progress}
                      aria-label={`Progress for ${project.name}`}
                      className="min-w-0 flex-1 accent-primary-500"
                      onChange={(event) => updateProject.mutate({
                        id: project.id,
                        progress: Number(event.target.value),
                        status: Number(event.target.value) === 100 ? 'COMPLETED' : 'ACTIVE',
                      })}
                    />
                    <div className="flex gap-2">
                      <input
                        value={updateDrafts[project.id] ?? ''}
                        onChange={(event) => setUpdateDrafts((current) => ({
                          ...current,
                          [project.id]: event.target.value,
                        }))}
                        placeholder="Post a client-visible update"
                        className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-card px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
                      />
                      <Button
                        size="sm"
                        disabled={!updateDrafts[project.id]?.trim() || addUpdate.isPending}
                        onClick={() => addUpdate.mutate({
                          projectId: project.id,
                          content: updateDrafts[project.id].trim(),
                        })}
                      >
                        Post
                      </Button>
                    </div>
                  </div>
                )}
                {project.updates.length > 0 && (
                  <div className="mt-4 border-t border-border-subtle pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Latest update</p>
                    <p className="mt-2 text-sm text-text-secondary">{project.updates[0].content}</p>
                  </div>
                )}
                {project.dueDate && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-text-tertiary">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Due {new Date(project.dueDate).toLocaleDateString()}
                  </p>
                )}
                {isAdmin && project.requests.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-border-subtle pt-3">
                    {project.requests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-text-secondary">{request.title}</span>
                        <select
                          value={request.status}
                          onChange={(event) => updateRequest.mutate({
                            id: request.id,
                            status: event.target.value as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED',
                          })}
                          className="rounded-md border border-border-subtle px-2 py-1 text-[10px]"
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )) : (
            <Card className="border-dashed border-border-subtle lg:col-span-2">
              <CardContent className="py-10 text-center text-sm text-text-tertiary">
                {isClient ? 'Your ARKO team will connect your first project here.' : 'No client projects yet.'}
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {isClient && (
        <section className="rounded-2xl border border-border-subtle bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary-400" />
            <h2 className="text-base font-semibold text-text-primary">Send a request</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={requestTitle}
              onChange={(event) => setRequestTitle(event.target.value)}
              placeholder="Request title"
              className="rounded-lg border border-border-subtle bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
            />
            <select
              value={requestProjectId}
              onChange={(event) => setRequestProjectId(event.target.value)}
              className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm"
            >
              <option value="">General request</option>
              {projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <textarea
            value={requestDescription}
            onChange={(event) => setRequestDescription(event.target.value)}
            placeholder="Describe what you need from the team"
            rows={3}
            className="mt-3 w-full resize-none rounded-lg border border-border-subtle bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none"
          />
          <Button
            size="sm"
            className="mt-3"
            disabled={!requestTitle.trim() || !requestDescription.trim() || createRequest.isPending}
            onClick={() => createRequest.mutate({
              title: requestTitle.trim(),
              description: requestDescription.trim(),
              projectId: requestProjectId || undefined,
            })}
          >
            {createRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit request
          </Button>
        </section>
      )}

      {(requests?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-base font-semibold text-text-primary">Request history</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-border-subtle bg-card">
            {requests?.map((request) => (
              <div key={request.id} className="flex items-center gap-3 border-b border-border-subtle px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{request.title}</p>
                  <p className="mt-0.5 truncate text-xs text-text-tertiary">
                    {isClient
                      ? request.project?.name ?? 'General request'
                      : `${request.client.name ?? request.client.email} · ${request.project?.name ?? 'General request'}`}
                  </p>
                </div>
                {isAdmin ? (
                  <select
                    value={request.status}
                    onChange={(event) => updateRequest.mutate({
                      id: request.id,
                      status: event.target.value as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED',
                    })}
                    className="rounded-md border border-border-subtle px-2 py-1.5 text-xs"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                ) : (
                  <span className="rounded-full bg-primary-500/10 px-2 py-1 text-[10px] font-semibold text-primary-400">
                    {request.status.replace('_', ' ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-text-primary">Portal tools</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-border-subtle bg-card p-4 transition-colors hover:border-primary-500/40"
            >
              <item.icon className="h-5 w-5 text-primary-400" />
              <h3 className="mt-4 text-sm font-semibold text-text-primary">{item.title}</h3>
              <p className="mt-1 text-xs leading-5 text-text-tertiary">{item.description}</p>
              <ArrowRight className="mt-4 h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-1 group-hover:text-primary-400" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
