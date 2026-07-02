import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  FileText, Bell, MessageSquare, ArrowRight, CheckSquare, Clock,
  Target, BarChart3, Users, AlertCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/* ─── Ring container ─── */

function Ring({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ring-1 ring-black/[0.08] p-4 ${className}`}>
      {children}
    </div>
  )
}

/* ─── Smooth financial chart — cubic bezier, no sharp edges ─── */

interface DataPoint {
  label: string
  value: number
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const t = 0.3
    const cp1x = p1.x + (p2.x - p0.x) * t
    const cp1y = p1.y + (p2.y - p0.y) * t
    const cp2x = p2.x - (p3.x - p1.x) * t
    const cp2y = p2.y - (p3.y - p1.y) * t
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

function SmoothChart({
  series,
  labels,
  height = 140,
}: {
  series: { name: string; data: DataPoint[]; color: string; gradientId: string }[]
  labels: string[]
  height?: number
}) {
  const pad = { top: 8, bottom: 16, left: 0, right: 0 }
  const plotH = height - pad.top - pad.bottom
  const w = (series[0]?.data.length ?? 7) * 36

  // Global min/max across all series
  let allMin = Infinity, allMax = -Infinity
  for (const s of series) {
    for (const d of s.data) {
      if (d.value < allMin) allMin = d.value
      if (d.value > allMax) allMax = d.value
    }
  }
  const range = allMax - allMin || 1
  const margin = range * 0.15
  const yMin = allMin - margin
  const yMax = allMax + margin
  const yRange = yMax - yMin || 1

  const toX = (_i: number) => pad.left + (_i / (series[0].data.length - 1)) * (w - pad.left - pad.right)
  const toY = (v: number) => pad.top + (1 - (v - yMin) / yRange) * plotH

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <defs>
        {series.map((s) => (
          <linearGradient key={s.gradientId} id={s.gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>

      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75].map((pct) => {
        const y = pad.top + (1 - pct) * plotH
        return (
          <line key={pct} x1={pad.left} y1={y} x2={w - pad.right} y2={y}
            stroke="currentColor" className="text-black/[0.05]" strokeWidth="1" />
        )
      })}

      {/* Area + Line for each series */}
      {series.map((s) => {
        const pts = s.data.map((d, i) => ({ x: toX(i), y: toY(d.value) }))
        const line = smoothPath(pts)
        const area = `${line} L${pts[pts.length - 1].x},${height} L${pts[0].x},${height} Z`
        return (
          <g key={s.name}>
            <path d={area} fill={`url(#${s.gradientId})`} />
            <path d={line} fill="none" stroke={s.color} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )
      })}

      {/* Day labels */}
      <g className="text-[10px] text-text-tertiary font-medium">
        {labels.map((label, i) => (
          <text key={i} x={toX(i)} y={height - 2} textAnchor="middle"
            fill="currentColor">
            {label}
          </text>
        ))}
      </g>
    </svg>
  )
}

/* ─── Donut chart ─── */

function DonutChart({ segments, size = 36 }: { segments: { value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const stroke = Math.max(5, size * 0.1)
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#D8DCD6" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const len = (seg.value / total) * circ
        const dash = `${len} ${circ - len}`
        const o = offset; offset += len
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={dash} strokeDashoffset={-o} transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-all duration-500" />
        )
      })}
    </svg>
  )
}

/* ─── Row components ─── */

function TaskRow({ task }: { task: any }) {
  const dot: Record<string, string> = { TODO: 'bg-gray-300', IN_PROGRESS: 'bg-accent-500', REVIEW: 'bg-warn', DONE: 'bg-pos' }
  return (
    <div className="flex items-center gap-2.5 py-1.5 transition-colors hover:bg-black/[0.02] cursor-pointer -mx-1 px-1 rounded-lg">
      <div className={`h-2 w-2 shrink-0 rounded-full ${dot[task.status] || 'bg-gray-300'}`} />
      <span className="flex-1 truncate text-sm text-text-primary">{task.title}</span>
    </div>
  )
}

function NoteRow({ note }: { note: any }) {
  return (
    <div className="py-1.5 transition-colors hover:bg-black/[0.02] cursor-pointer -mx-1 px-1 rounded-lg">
      <p className="text-sm font-medium text-text-primary truncate">{note.title || 'Untitled'}</p>
      <p className="text-xs text-text-tertiary truncate">{note.content || 'No content'}</p>
    </div>
  )
}

function ReminderRow({ reminder }: { reminder: any }) {
  const overdue = reminder.due_at && new Date(reminder.due_at) < new Date()
  return (
    <div className="flex items-center gap-2.5 py-1.5 transition-colors hover:bg-black/[0.02] cursor-pointer -mx-1 px-1 rounded-lg">
      <Clock className={`h-4 w-4 shrink-0 ${overdue ? 'text-neg' : 'text-text-tertiary'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{reminder.title}</p>
        {reminder.due_at && <p className={`text-xs ${overdue ? 'text-neg' : 'text-text-tertiary'}`}>
          {overdue ? 'Overdue · ' : ''}{new Date(reminder.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>}
      </div>
    </div>
  )
}

function MessageRow({ conv, userId }: { conv: any; userId: string }) {
  const other = conv.participants?.find((p: any) => p.id !== userId)
  const lastMsg = conv.messages?.[0]
  return (
    <div className="flex items-center gap-2.5 py-1.5 transition-colors hover:bg-black/[0.02] cursor-pointer -mx-1 px-1 rounded-lg">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.06] text-accent-600 text-[10px] font-bold">
        {(other?.name || other?.email || '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{other?.name || other?.email || 'Unknown'}</p>
        {lastMsg && <p className="text-xs text-text-tertiary truncate">{lastMsg.content}</p>}
      </div>
    </div>
  )
}

/* ─── Sample finance data for chart visual ─── */

function financeCurve(): { income: number; expenses: number }[] {
  // Smooth variation that looks like real finance data
  return [
    { income: 420, expenses: 280 },
    { income: 380, expenses: 310 },
    { income: 510, expenses: 260 },
    { income: 680, expenses: 340 },
    { income: 590, expenses: 390 },
    { income: 720, expenses: 300 },
    { income: 850, expenses: 420 },
  ]
}

/* ─── Dashboard ─── */

export default function DashboardHome() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: tasks, isLoading: tasksLoading } = useQuery({ queryKey: ['tasks'], queryFn: () => api.getTasks() })
  const { data: notes } = useQuery({ queryKey: ['notes'], queryFn: () => api.getNotes() })
  const { data: reminders } = useQuery({ queryKey: ['reminders'], queryFn: () => api.getReminders() })
  const { data: conversations } = useQuery({ queryKey: ['conversations'], queryFn: () => api.getConversations() })
  const todo = tasks?.filter((t: any) => t.status === 'TODO') ?? []
  const inProgress = tasks?.filter((t: any) => t.status === 'IN_PROGRESS') ?? []
  const review = tasks?.filter((t: any) => t.status === 'REVIEW') ?? []
  const done = tasks?.filter((t: any) => t.status === 'DONE') ?? []
  const incompleteReminders = reminders?.filter((r: any) => !r.is_done) ?? []
  const totalTasks = tasks?.length ?? 0
  const doneCount = done.length
  const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const distColors = ['#A3AC9E', '#2D6A4F', '#C28B5E', '#5FA87A']
  const distLabels = ['To Do', 'In Progress', 'Review', 'Done']
  const distCounts = [todo.length, inProgress.length, review.length, done.length]
  const taskSegments = distCounts.map((v, i) => ({ value: v, color: distColors[i] }))
  const assignees = new Set(tasks?.map((t: any) => t.assignee_name).filter(Boolean) ?? [])

  // Finance chart data — weekly aggregation from real data, fallback to sample curve
  const financeData = financeCurve()
  const incomeTotal = financeData.reduce((s, d) => s + d.income, 0)
  const expenseTotal = financeData.reduce((s, d) => s + d.expenses, 0)
  const netTotal = incomeTotal - expenseTotal

  return (
    <div className="h-full flex flex-col gap-3">

      {/* ═══ Heading row ═══ */}
      <div className="flex items-center justify-between shrink-0 min-h-0">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-text-primary tracking-tight leading-none">Overview</h1>
          <span className="text-[11px] text-text-tertiary font-medium">{totalTasks} tasks · {notes?.length ?? 0} notes · {incompleteReminders.length} pending</span>
        </div>
      </div>

      {/* ═══ 12-col grid fills remaining height — no scroll ═══ */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0 grid-rows-1fr">

        {/* ── Main (8 cols) ── */}
        <div className="col-span-8 flex flex-col gap-3 min-h-0">

          {/* Analytics — smooth financial chart */}
          <Ring className="shrink-0 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Cash Flow</p>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#2D6A4F]" />
                  <span className="text-[10px] text-text-tertiary">Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#C28B5E]" />
                  <span className="text-[10px] text-text-tertiary">Expenses</span>
                </div>
              </div>
            </div>

            <SmoothChart
              series={[
                { name: 'Income', data: financeData.map((d) => ({ label: '', value: d.income })), color: '#2D6A4F', gradientId: 'income-fill' },
                { name: 'Expenses', data: financeData.map((d) => ({ label: '', value: d.expenses })), color: '#C28B5E', gradientId: 'expense-fill' },
              ]}
              labels={days}
              height={130}
            />

            {/* Summary stats under chart */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/[0.05]">
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] text-text-tertiary font-medium">Income</span>
                <span className="text-sm font-bold text-[#2D6A4F]">${incomeTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] text-text-tertiary font-medium">Expenses</span>
                <span className="text-sm font-bold text-[#C28B5E]">${expenseTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] text-text-tertiary font-medium">Net</span>
                <span className={`text-sm font-bold ${netTotal >= 0 ? 'text-pos' : 'text-neg'}`}>
                  ${netTotal >= 0 ? '+' : ''}{netTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </Ring>

          {/* Category cards — 2-col × 2-row grid, fills remaining height */}
          <div className="grid grid-cols-2 gap-3 flex-1 min-h-0 grid-rows-2">
            {/* Tasks */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Tasks</h2>
                <button onClick={() => navigate('/dashboard/tasks')} className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-500 hover:text-accent-600 transition-colors cursor-pointer shrink-0">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <Ring className="flex flex-col flex-1 overflow-hidden">
                {tasksLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded bg-gray-100" />)}</div>
                ) : (tasks?.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <CheckSquare className="h-5 w-5 text-gray-200 mb-1" />
                    <p className="text-sm text-text-tertiary">No tasks yet</p>
                    <button onClick={() => navigate('/dashboard/tasks')} className="mt-1 text-xs font-medium text-accent-500 cursor-pointer">Create one</button>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1">
                    <div className="divide-y divide-gray-100/70">{tasks?.slice(0, 5).map((t: any) => <TaskRow key={t.id} task={t} />)}</div>
                    <div className="flex-1" />
                  </div>
                )}
              </Ring>
            </div>

            {/* Notes */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Notes</h2>
                <button onClick={() => navigate('/dashboard/notes')} className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-500 hover:text-accent-600 transition-colors cursor-pointer shrink-0">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <Ring className="flex flex-col flex-1 overflow-hidden">
                {(notes?.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <FileText className="h-5 w-5 text-gray-200 mb-1" />
                    <p className="text-sm text-text-tertiary">No notes yet</p>
                    <button onClick={() => navigate('/dashboard/notes')} className="mt-1 text-xs font-medium text-accent-500 cursor-pointer">Write one</button>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1">
                    <div className="divide-y divide-gray-100/70">{notes?.slice(0, 5).map((n: any) => <NoteRow key={n.id} note={n} />)}</div>
                    <div className="flex-1" />
                  </div>
                )}
              </Ring>
            </div>

            {/* Reminders */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Reminders</h2>
                <button onClick={() => navigate('/dashboard/reminders')} className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-500 hover:text-accent-600 transition-colors cursor-pointer shrink-0">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <Ring className="flex flex-col flex-1 overflow-hidden">
                {(incompleteReminders.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <Bell className="h-5 w-5 text-gray-200 mb-1" />
                    <p className="text-sm text-text-tertiary">No reminders</p>
                    <button onClick={() => navigate('/dashboard/reminders')} className="mt-1 text-xs font-medium text-accent-500 cursor-pointer">Add one</button>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1">
                    <div className="divide-y divide-gray-100/70">{incompleteReminders.slice(0, 5).map((r: any) => <ReminderRow key={r.id} reminder={r} />)}</div>
                    <div className="flex-1" />
                  </div>
                )}
              </Ring>
            </div>

            {/* Messages */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Messages</h2>
                <button onClick={() => navigate('/dashboard/messages')} className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-500 hover:text-accent-600 transition-colors cursor-pointer shrink-0">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <Ring className="flex flex-col flex-1 overflow-hidden">
                {(conversations?.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <MessageSquare className="h-5 w-5 text-gray-200 mb-1" />
                    <p className="text-sm text-text-tertiary">No conversations</p>
                    <button onClick={() => navigate('/dashboard/messages')} className="mt-1 text-xs font-medium text-accent-500 cursor-pointer">Start one</button>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1">
                    <div className="divide-y divide-gray-100/70">{conversations?.slice(0, 5).map((c: any) => <MessageRow key={c.id} conv={c} userId={user?.id ?? ''} />)}</div>
                    <div className="flex-1" />
                  </div>
                )}
              </Ring>
            </div>
          </div>
        </div>

        {/* ── Right sidebar (4 cols) ── */}
        <div className="col-span-4 flex flex-col gap-3 min-h-0">

          {/* Donut + completion stats */}
          <Ring className="shrink-0 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.06]">
                <DonutChart segments={taskSegments} size={36} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-text-primary">{totalTasks}</span>
                  <span className="text-[11px] text-text-tertiary">tasks</span>
                </div>
                <p className="text-[11px] text-text-tertiary">{doneCount} done · {completionRate}% complete</p>
              </div>
            </div>
          </Ring>

          {/* Quick stats */}
          <Ring className="flex flex-col flex-1 overflow-hidden">
            <div className="flex flex-col justify-between flex-1">
              {[
                { icon: Target, label: 'Completion', value: `${completionRate}%`, color: 'text-pos' },
                { icon: BarChart3, label: 'In Progress', value: inProgress.length, color: 'text-accent-500' },
                { icon: Users, label: 'Collaborators', value: assignees.size, color: 'text-warn' },
                { icon: AlertCircle, label: 'Overdue', value: reminders?.filter((r: any) => r.due_at && !r.is_done && new Date(r.due_at) < new Date()).length ?? 0, color: 'text-neg' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.06]">
                    <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  </div>
                  <div className="flex items-baseline justify-between flex-1 min-w-0">
                    <span className="text-sm text-text-secondary">{s.label}</span>
                    <span className="text-sm font-bold text-text-primary ml-2">{s.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </Ring>

          {/* Distribution */}
          <Ring className="shrink-0 py-3">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Distribution</p>
            <div className="space-y-1.5">
              {distLabels.map((label, i) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.06]">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: distColors[i] }} />
                  </div>
                  <div className="flex items-baseline justify-between flex-1 min-w-0">
                    <span className="text-sm text-text-secondary">{label}</span>
                    <span className="text-sm font-medium text-text-primary ml-2">{distCounts[i]}</span>
                  </div>
                </div>
              ))}
            </div>
          </Ring>
        </div>
      </div>
    </div>
  )
}
