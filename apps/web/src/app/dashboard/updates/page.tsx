'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@arko/ui'
import { GitCommit, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

function timeAgo(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function UpdatesPage() {
  const { data, isLoading, error } = api.github.recentCommits.useQuery()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-gray-500">Failed to load updates</p>
      </div>
    )
  }

  if (data?.error) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <GitCommit className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-sm font-medium text-gray-500">Updates unavailable</p>
        <p className="mt-1 text-xs text-gray-400 max-w-xs">{data.error}</p>
      </div>
    )
  }

  const commits = data?.commits ?? []

  if (commits.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <GitCommit className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-sm text-gray-500">No recent commits</p>
      </div>
    )
  }

  // Group commits by date
  const groups: { label: string; commits: typeof commits }[] = []
  const now = new Date()
  const today = now.toDateString()
  const yesterday = new Date(now.getTime() - 86400000).toDateString()

  commits.forEach((commit) => {
    const date = new Date(commit.commit.author.date)
    const dateStr = date.toDateString()
    let label: string
    if (dateStr === today) label = 'Today'
    else if (dateStr === yesterday) label = 'Yesterday'
    else if (now.getTime() - date.getTime() < 7 * 86400000) label = 'This week'
    else label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    const existing = groups[groups.length - 1]
    if (existing && existing.label === label) {
      existing.commits.push(commit)
    } else {
      groups.push({ label, commits: [commit] })
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Updates</h1>
        <p className="text-sm text-gray-500 mt-1">Latest commits from the repo</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
              <GitCommit className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <CardTitle className="text-sm font-bold text-gray-800">GitHub Commits</CardTitle>
          </div>
          <a
            href={`https://github.com/${commits[0].html_url.split('/').slice(0, 5).join('/')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            View repo
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="sticky top-0 border-b border-gray-100 bg-gray-50/80 px-6 py-1.5 backdrop-blur-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {group.label}
                </span>
              </div>
              {group.commits.map((commit) => {
                const firstLine = commit.commit.message.split('\n')[0]
                const cat = firstLine.match(/^(\w+)/)?.[1]?.toLowerCase() ?? ''
                const badge =
                  ['feat', 'fix', 'docs', 'chore', 'refactor', 'test', 'style', 'perf'].includes(cat)
                    ? cat
                    : null
                return (
                  <a
                    key={commit.sha}
                    href={commit.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-6 py-2.5 transition-colors hover:bg-gray-50 group border-b border-gray-50 last:border-0"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <GitCommit className="h-3 w-3 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                        {firstLine}
                      </p>
                    </div>
                    {badge && (
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none ${
                        badge === 'feat' ? 'bg-primary-50 text-primary-700' :
                        badge === 'fix' ? 'bg-green-50 text-green-700' :
                        badge === 'docs' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {badge}
                      </span>
                    )}
                    <span className="shrink-0 text-[10px] tabular-nums text-gray-400">
                      {timeAgo(commit.commit.author.date)}
                    </span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </a>
                )
              })}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
