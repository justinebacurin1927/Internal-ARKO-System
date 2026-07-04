import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  FileText, Bell, ArrowRight, CheckSquare, Clock,
  Target, BarChart3, Users, AlertCircle, GitCommitHorizontal,
  Sparkles, Sun, Moon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/Card'

/* ─── Time-of-day greeting ─── */

function getGreeting(): { text: string; icon: typeof Sun } {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', icon: Sparkles }
  if (h < 17) return { text: 'Good afternoon', icon: Sun }
  return { text: 'Good evening', icon: Moon }
}

/* ─── Stat pill (compact metric badge) ─── */

function StatPill({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full ring-1 ring-black/[0.06] bg-white px-2.5 py-1">
      <Icon className="h-3.5 w-3.5 text-text-tertiary" />
      <span className="text-xs font-semibold text-text-primary tabular-nums">{value}</span>
      <span className="text-[10px] text-text-tertiary font-medium hidden sm:inline">{label}</span>
    </div>
  )
}

/* ─── Greeting band — time-aware, counts tasks-in-flight with a subtle tick ─── */

function GreetingBand({ totalTasks, noteCount, reminderCount }: { totalTasks: number; noteCount: number; reminderCount: number }) {
  const { user } = useAuth()
  const { text, icon: Icon } = getGreeting()
  const [displayCount, setDisplayCount] = useState(0)

  useEffect(() => {
    const target = totalTasks
    if (target === 0) { setDisplayCount(0); return }
    let current = 0
    const step = Math.max(1, Math.ceil(target / 30))
    const interval = setInterval(() => {
      current += step
      if (current >= target) {
        setDisplayCount(target)
        clearInterval(interval)
      } else setDisplayCount(current)
    }, 16)
    return () => clearInterval(interval)
  }, [totalTasks])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="flex items-center justify-between shrink-0 min-h-0 animate-[slide-up_0.4s_ease-out_forwards]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500/10 text-accent-500 ring-1 ring-accent-500/20">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div>
          <h1 className="text-xs font-semibold text-text-primary tracking-tight">
            {text}, <span className="text-accent-500">{user?.name?.split(' ')[0] ?? 'Founder'}</span>
          </h1>
          <p className="text-xs text-text-tertiary">
            {today}
            {totalTasks > 0 && (
              <> · <span className="text-accent-500 font-medium tabular-nums">{displayCount}</span> tasks in flight</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatPill icon={CheckSquare} value={totalTasks} label="Tasks" />
        <StatPill icon={FileText} value={noteCount} label="Notes" />
        <StatPill icon={Bell} value={reminderCount} label="Pending" />
      </div>
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
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [vw, setVw] = useState(400)
  const pad = { top: 8, bottom: 16, left: 8, right: 8 }
  const plotH = height - pad.top - pad.bottom
  const lineRefs = useRef<(SVGPathElement | null)[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setVw(entry.contentRect.width)
    })
    ro.observe(el)
    setVw(el.getBoundingClientRect().width || 400)
    return () => ro.disconnect()
  }, [])

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
  const n = series[0]?.data.length ?? 7

  const toX = (_i: number) => pad.left + (_i / Math.max(n - 1, 1)) * (vw - pad.left - pad.right)
  const toY = (v: number) => pad.top + (1 - (v - yMin) / yRange) * plotH

  useEffect(() => {
    requestAnimationFrame(() => {
      setReady(true)
      lineRefs.current.forEach((el) => {
        if (el) {
          const len = el.getTotalLength()
          el.style.strokeDasharray = `${len}`
          el.style.strokeDashoffset = `${len}`
          el.getBoundingClientRect()
          el.style.transition = 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)'
          el.style.strokeDashoffset = '0'
        }
      })
    })
  }, [])

  return (
    <svg ref={svgRef} viewBox={`0 0 ${vw} ${height}`} className="w-full" style={{ height }}>
      <defs>
        {series.map((s) => (
          <linearGradient key={s.gradientId} id={s.gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>

      {[0.25, 0.5, 0.75].map((pct) => {
        const y = pad.top + (1 - pct) * plotH
        return (
          <line key={pct} x1={pad.left} y1={y} x2={vw - pad.right} y2={y}
            stroke="currentColor" className="text-black/[0.05]" strokeWidth="1" />
        )
      })}

      {series.map((s, si) => {
        const pts = s.data.map((d, i) => ({ x: toX(i), y: toY(d.value) }))
        const line = smoothPath(pts)
        const area = `${line} L${pts[pts.length - 1].x},${height} L${pts[0].x},${height} Z`
        return (
          <g key={s.name}>
            <path d={area} fill={`url(#${s.gradientId})`}
              className="transition-opacity duration-700"
              style={{ opacity: ready ? 1 : 0 }} />
            <path ref={el => { lineRefs.current[si] = el }} d={line} fill="none" stroke={s.color} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )
      })}

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
    <div className="flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-black/[0.03] cursor-pointer rounded-lg">
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[task.status] || 'bg-gray-300'}`} />
      <span className="flex-1 truncate text-sm text-text-primary">{task.title}</span>
    </div>
  )
}

function ReminderRow({ reminder }: { reminder: any }) {
  const overdue = reminder.due_at && new Date(reminder.due_at) < new Date()
  return (
    <div className="flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-black/[0.03] cursor-pointer rounded-lg">
      <Clock className={`h-4 w-4 shrink-0 ${overdue ? 'text-neg' : 'text-text-tertiary'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{reminder.title}</p>
        {reminder.due_at && (
          <p className={`text-xs ${overdue ? 'text-neg' : 'text-text-tertiary'}`}>
            {overdue ? 'Overdue · ' : ''}{new Date(reminder.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  )
}

/* ─── Sample finance data (fallback) ─── */

function financeCurve(): { income: number; expenses: number }[] {
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

  const { data: tasks, isLoading: tasksLoading } = useQuery({ queryKey: ['tasks'], queryFn: () => api.getTasks() })
  const { data: notes } = useQuery({ queryKey: ['notes'], queryFn: () => api.getNotes() })
  const { data: reminders } = useQuery({ queryKey: ['reminders'], queryFn: () => api.getReminders() })
  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: () => api.getTransactions(1) })
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

  // Finance chart — aggregate real transactions into daily buckets
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const day = d.toISOString().split('T')[0]
    const dayTxs = (transactions ?? []).filter((tx: any) => {
      const txDate = typeof tx.date === 'string' ? tx.date.split('T')[0] : tx.date
      return txDate === day
    })
    return {
      income: dayTxs.filter((tx: any) => tx.type === 'INCOME').reduce((s: number, tx: any) => s + tx.amount, 0),
      expenses: dayTxs.filter((tx: any) => tx.type === 'EXPENSE').reduce((s: number, tx: any) => s + tx.amount, 0),
    }
  })
  const incomeTotal = last7.reduce((s, d) => s + d.income, 0)
  const expenseTotal = last7.reduce((s, d) => s + d.expenses, 0)
  const netTotal = incomeTotal - expenseTotal
  const hasTx = (transactions?.length ?? 0) > 0
  const chartData = hasTx ? last7 : financeCurve()

  const cardDelay = (i: number) => ({ animationDelay: `${40 + i * 60}ms` })

  return (
    <div className="h-full flex flex-col gap-2">

      {/* ═══ Greeting band ═══ */}
      <GreetingBand totalTasks={totalTasks} noteCount={notes?.length ?? 0} reminderCount={incompleteReminders.length} />

      {/* ═══ 12-col grid fills remaining height ═══ */}
      <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 grid-rows-1fr">

        {/* ── Main (8 cols) ── */}
        <div className="col-span-8 flex flex-col gap-2 min-h-0">

          {/* ── Cash Flow chart — premium accent card ── */}
          <Card
            className="shrink-0 p-3.5 border-t-2 border-accent-500 animate-[card-enter_450ms_ease-out_forwards] opacity-0"
            style={cardDelay(0)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Cash Flow</p>
                <span className="text-[10px] text-text-tertiary">Last 7 days</span>
              </div>
              <div className="flex items-center gap-3">
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
                { name: 'Income', data: chartData.map((d) => ({ label: '', value: d.income })), color: '#2D6A4F', gradientId: 'income-fill' },
                { name: 'Expenses', data: chartData.map((d) => ({ label: '', value: d.expenses })), color: '#C28B5E', gradientId: 'expense-fill' },
              ]}
              labels={days}
              height={90}
            />

            {/* Summary stats under chart */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.05]">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-text-tertiary font-medium">Income</span>
                <span className="text-sm font-bold text-[#2D6A4F]">${incomeTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-text-tertiary font-medium">Expenses</span>
                <span className="text-sm font-bold text-[#C28B5E]">${expenseTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-text-tertiary font-medium">Net</span>
                <span className={`text-sm font-bold ${netTotal >= 0 ? 'text-pos' : 'text-neg'}`}>
                  {netTotal >= 0 ? '+' : ''}${netTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          {/* ── 2×2 category grid ── */}
          <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 grid-rows-2">

            {/* Tasks */}
            <div className="flex flex-col min-h-0" style={cardDelay(1)}>
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Tasks</h2>
                <button onClick={() => navigate('/dashboard/tasks')}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-500 hover:text-accent-600 transition-colors cursor-pointer shrink-0">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <Card className="flex flex-col flex-1 overflow-hidden p-3.5 animate-[card-enter_450ms_ease-out_forwards] opacity-0">
                {tasksLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded bg-gray-100" />)}</div>
                ) : (tasks?.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <CheckSquare className="h-5 w-5 text-gray-200 mb-1" />
                    <p className="text-sm text-text-tertiary">No tasks yet</p>
                    <button onClick={() => navigate('/dashboard/tasks')}
                      className="mt-1 text-xs font-medium text-accent-500 cursor-pointer">Create one</button>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 gap-0.5">
                    {tasks?.slice(0, 4).map((t: any) => <TaskRow key={t.id} task={t} />)}
                  </div>
                )}
              </Card>
            </div>

            {/* Updates — right column, spans both rows */}
            <div className="flex flex-col min-h-0 row-span-2 col-start-2" style={cardDelay(2)}>
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Updates</h2>
              </div>
              <Card className="flex flex-col flex-1 overflow-hidden p-3.5 animate-[card-enter_450ms_ease-out_forwards] opacity-0">
                <div className="flex flex-col flex-1 gap-0.5">
                  {[
                    { hash: 'c97a838', msg: 'chart: replace preserveAspectRatio=none with ResizeObserver-synced viewBox width' },
                    { hash: 'fc8e022', msg: 'chart: fill full card width with preserveAspectRatio=none, add line-draw animation' },
                    { hash: 'ecf316b', msg: 'layout: fill viewport on all pages, login/register forest green palette' },
                    { hash: '9fc2d7a', msg: 'frontend: forest green + amber palette, smooth financial chart, compact layout' },
                    { hash: '2427421', msg: 'broken changes' },
                    { hash: '8aad8a2', msg: 'fix month/year rendering (auto-rows-1fr → CSS, year card styling)' },
                    { hash: 'fe8a33b', msg: 'dashboard: premium redesign — greeting band, stagger, card accent' },
                    { hash: 'd4e2b1c', msg: 'dashboard: open up card spacing, 4 items, p-4, gap-0.5' },
                  ].map((c) => (
                    <div key={c.hash} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-black/[0.03] cursor-pointer transition-colors">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.06] bg-white">
                        <GitCommitHorizontal className="h-3.5 w-3.5 text-accent-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <code className="text-[11px] font-mono font-bold text-accent-500">{c.hash}</code>
                        <p className="text-xs text-text-tertiary truncate">{c.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Reminders — bottom-left */}
            <div className="flex flex-col min-h-0 row-start-2" style={cardDelay(3)}>
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Reminders</h2>
                <button onClick={() => navigate('/dashboard/reminders')}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-500 hover:text-accent-600 transition-colors cursor-pointer shrink-0">
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <Card className="flex flex-col flex-1 overflow-hidden p-3.5 animate-[card-enter_450ms_ease-out_forwards] opacity-0">
                {(incompleteReminders.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <Bell className="h-5 w-5 text-gray-200 mb-1" />
                    <p className="text-sm text-text-tertiary">No reminders</p>
                    <button onClick={() => navigate('/dashboard/reminders')}
                      className="mt-1 text-xs font-medium text-accent-500 cursor-pointer">Add one</button>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 gap-0.5">
                    {incompleteReminders.slice(0, 4).map((r: any) => <ReminderRow key={r.id} reminder={r} />)}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        {/* ── Right sidebar (4 cols) ── */}
        <div className="col-span-4 flex flex-col gap-2 min-h-0">

          {/* Donut + completion stats */}
          <Card className="shrink-0 p-3.5 animate-[card-enter_450ms_ease-out_forwards] opacity-0" style={cardDelay(1)}>
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <DonutChart segments={taskSegments} size={36} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-text-primary tabular-nums">{totalTasks}</span>
                  <span className="text-[11px] text-text-tertiary">tasks</span>
                </div>
                <p className="text-xs text-text-tertiary mt-0.5">
                  <span className="font-semibold text-pos">{doneCount}</span> done · {completionRate}% complete
                </p>
              </div>
            </div>
          </Card>

          {/* Quick stats */}
          <Card className="flex flex-col flex-1 overflow-hidden p-3.5 animate-[card-enter_450ms_ease-out_forwards] opacity-0" style={cardDelay(2)}>
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Stats</p>
            <div className="flex flex-col justify-between flex-1 gap-1">
              {[
                { icon: Target, label: 'Completion', value: `${completionRate}%`, color: 'text-pos' },
                { icon: BarChart3, label: 'In Progress', value: inProgress.length, color: 'text-accent-500' },
                { icon: Users, label: 'Collaborators', value: assignees.size, color: 'text-warn' },
                { icon: AlertCircle, label: 'Overdue', value: reminders?.filter((r: any) => r.due_at && !r.is_done && new Date(r.due_at) < new Date()).length ?? 0, color: 'text-neg' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.06] bg-white">
                    <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  </div>
                  <div className="flex items-baseline justify-between flex-1 min-w-0">
                    <span className="text-sm text-text-secondary">{s.label}</span>
                    <span className="text-sm font-bold text-text-primary ml-2 tabular-nums">{s.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Distribution */}
          <Card className="shrink-0 p-3.5 animate-[card-enter_450ms_ease-out_forwards] opacity-0" style={cardDelay(3)}>
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Distribution</p>
            <div className="space-y-2">
              {distLabels.map((label, i) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.06] bg-white">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: distColors[i] }} />
                  </div>
                  <div className="flex items-baseline justify-between flex-1 min-w-0">
                    <span className="text-sm text-text-secondary">{label}</span>
                    <span className="text-sm font-medium text-text-primary ml-2 tabular-nums">{distCounts[i]}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
