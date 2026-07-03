import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2, X, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'

/* ─── Types ─── */

interface CalendarEvent {
  id: string
  title: string
  day: number; startSlot: number; endSlot: number
  color: string; source: 'event' | 'task' | 'reminder'
  sourceId: string; description?: string
}

/* ─── Helpers ─── */

const DAY_ABBRS = ['Mo','Tu','We','Th','Fr','Sa','Su']
const SLOTS = ['8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM']
const SLOT_COUNT = SLOTS.length
const EVENT_COLORS = ['#2D6A4F','#5FA87A','#C28B5E','#C2655C','#4A5B4E','#7A8B7E']
const TASK_COLOR = '#4A7B9D'; const REMINDER_COLOR = '#C28B5E'

function getMonday(d: Date) {
  const x = new Date(d); const day = x.getDay()
  x.setDate(x.getDate() - day + (day === 0 ? -6 : 1)); x.setHours(0,0,0,0); return x
}
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate()+n); return r }
const isToday = (d: Date) => { const n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate() }
const fmtShort = (d: Date) => d.toLocaleDateString('en-US',{month:'short',day:'numeric'})
const weekLabel = (m: Date) => `${fmtShort(m)} – ${fmtShort(addDays(m,6))}`
const toDS = (d: Date) => d.toISOString().split('T')[0]
const timeToSlot = (t: string) => { const h=+t.split(':')[0], m=+t.split(':')[1]; return Math.max(0,Math.min(SLOT_COUNT-1,h-8+(m>=30?.5:0))) }
const slotToTime = (s: number) => `${String(s+8).padStart(2,'0')}:00`
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime()-a.getTime())/86400000)

/* ════════════════════════════════════════════════════════════════ */

export default function CalendarPage() {
  const qc = useQueryClient()

  const [baseMonday, setBaseMonday] = useState(() => getMonday(new Date()))
  const goToday = useCallback(()=>setBaseMonday(getMonday(new Date())),[])
  const prevWeek = useCallback(()=>setBaseMonday(d=>addDays(d,-7)),[])
  const nextWeek = useCallback(()=>setBaseMonday(d=>addDays(d,7)),[])

  const mStr = useMemo(()=>toDS(baseMonday),[baseMonday])
  const sunStr = useMemo(()=>toDS(addDays(baseMonday,6)),[baseMonday])

  const days = useMemo(()=>Array.from({length:7},(_,i)=>{
    const d=addDays(baseMonday,i); return {abbr:DAY_ABBRS[i],num:d.getDate(),full:d,today:isToday(d),ds:toDS(d)}
  }),[baseMonday])

  /* ── Data ── */
  const eq = useQuery({queryKey:['events',mStr,sunStr],queryFn:()=>api.getEvents(mStr,sunStr)})
  const tq = useQuery({queryKey:['tasks'],queryFn:()=>api.getTasks()})
  const rq = useQuery({queryKey:['reminders'],queryFn:()=>api.getReminders()})
  const sq = useQuery({queryKey:['sprints'],queryFn:()=>api.getSprints(true)})
  const loading = eq.isLoading  // only events blocks the grid; tasks/reminders/sprints load in background
  const error = eq.error

  const apiEvs = eq.data??[]; const tasks = tq.data??[]; const reminders = rq.data??[]; const sprints = sq.data??[]
  const activeSprint = useMemo(()=>(sprints as any[]).find((s:any)=>s.is_active),[sprints])
  const sprintDaysInView = useMemo(()=>{
    if(!activeSprint)return []; const s=new Date(activeSprint.start_date),e=new Date(activeSprint.end_date)
    return days.filter(d=>{const dd=new Date(d.ds+'T00:00:00');return dd>=s&&dd<=e}).map(d=>d.ds)
  },[activeSprint,days])
  const sprintProgress = useMemo(()=>{
    if(!activeSprint)return {cur:0,tot:0,pct:0}
    const tot=daysBetween(new Date(activeSprint.start_date),new Date(activeSprint.end_date))+1
    const cur=Math.min(tot,Math.max(0,daysBetween(new Date(activeSprint.start_date),new Date())+1))
    return {cur,tot,pct:tot>0?Math.round(cur/tot*100):0}
  },[activeSprint])

  /* ── Merge ── */
  const gridEvs = useMemo(():CalendarEvent[]=>{
    const r:CalendarEvent[]=[]; const dds=days.map(d=>d.ds); let ci=0
    for(const e of apiEvs){const di=dds.indexOf(e.date);if(di===-1)continue
      const s=timeToSlot(e.start_time),end=Math.min(Math.max(s+1,Math.ceil(timeToSlot(e.end_time))),SLOT_COUNT)
      r.push({id:`evt-${e.id}`,title:e.title,day:di,startSlot:s,endSlot:end,color:e.color||EVENT_COLORS[ci++%EVENT_COLORS.length],source:'event',sourceId:e.id,description:e.description})}
    for(const t of tasks){
      if(!t.due_date)continue;const due=new Date(t.due_date); const di=dds.indexOf(toDS(due)); if(di===-1)continue
      const slot=timeToSlot(due.toISOString().slice(11,16))
      r.push({id:`task-${t.id}`,title:t.title,day:di,startSlot:slot,endSlot:Math.min(slot+Math.max(1,Math.ceil(due.getMinutes()/60)+1),SLOT_COUNT),color:TASK_COLOR,source:'task',sourceId:t.id})}
    for(const r2 of reminders){
      if(!r2.due_at)continue;const due=new Date(r2.due_at); const di=dds.indexOf(toDS(due)); if(di===-1)continue
      const slot=timeToSlot(due.toISOString().slice(11,16))
      r.push({id:`rem-${r2.id}`,title:`${r2.is_done?'✓ ':''}${r2.title}`,day:di,startSlot:slot,endSlot:Math.min(slot+1,SLOT_COUNT),color:REMINDER_COLOR,source:'reminder',sourceId:r2.id})}
    return r
  },[apiEvs,tasks,reminders,days])

  /* ── Form ── */
  const [showSheet,setShowSheet] = useState(false)
  const [editing,setEditing] = useState<any|null>(null)
  const [fTitle,setFTitle] = useState('')
  const [fDate,setFDate] = useState('')
  const [fStart,setFStart] = useState('09:00')
  const [fEnd,setFEnd] = useState('10:00')
  const [fColor,setFColor] = useState(EVENT_COLORS[0])
  const [confirmId,setConfirmId] = useState<string|null>(null)

  const resetF = ()=>{setFTitle('');setFDate('');setFStart('09:00');setFEnd('10:00');setFColor(EVENT_COLORS[0]);setEditing(null)}
  const openCreate = (dayIdx?:number,slotIdx?:number)=>{
    resetF();if(dayIdx!==undefined&&days[dayIdx])setFDate(days[dayIdx].ds)
    if(slotIdx!==undefined){setFStart(slotToTime(slotIdx));setFEnd(slotToTime(Math.min(slotIdx+1,SLOT_COUNT-1)))}
    setShowSheet(true)
  }
  const openEdit = (ev:CalendarEvent)=>{
    const o=apiEvs.find((e:any)=>`evt-${e.id}`===ev.id)
    if(o){setEditing(o);setFTitle(o.title);setFDate(o.date);setFStart(o.start_time);setFEnd(o.end_time);setFColor(o.color||EVENT_COLORS[0]);setShowSheet(true)}
  }
  const closeSheet = ()=>{setShowSheet(false);resetF()}

  const createM = useMutation({mutationFn:()=>api.createEvent({title:fTitle.trim(),date:fDate,start_time:fStart,end_time:fEnd,color:fColor}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['events']});closeSheet()}})
  const updateM = useMutation({mutationFn:()=>api.updateEvent(editing!.id,{title:fTitle.trim(),date:fDate,start_time:fStart,end_time:fEnd,color:fColor}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['events']});closeSheet()}})
  const deleteM = useMutation({mutationFn:(id:string)=>api.deleteEvent(id),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['events']})}})

  /* ── Render ── */
  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <header className="flex items-center justify-between shrink-0 mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Calendar</h1>
          {activeSprint && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-widest shadow-xs"
              style={{backgroundColor:activeSprint.color}}>
              <span>{activeSprint.name}</span>
              <span className="opacity-60">·</span>
              <span className="opacity-75">D{sprintProgress.cur}/{sprintProgress.tot}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={goToday}>
            <CalendarDays className="h-3 w-3" /> Today
          </Button>
          <div className="flex items-center rounded-lg border border-border-subtle">
            <button onClick={prevWeek} className="p-1 text-text-tertiary hover:text-text-primary hover:bg-bg-app transition-colors rounded-l-lg cursor-pointer">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 py-1 text-[11px] font-medium text-text-secondary tabular-nums border-x border-border-subtle min-w-[124px] text-center select-none">
              {weekLabel(baseMonday)}
            </span>
            <button onClick={nextWeek} className="p-1 text-text-tertiary hover:text-text-primary hover:bg-bg-app transition-colors rounded-r-lg cursor-pointer">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Error ── */}
      {error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neg-bg"><AlertCircle className="h-5 w-5 text-neg" /></div>
            <p className="text-sm font-medium text-text-primary">Failed to load</p>
            <Button size="sm" variant="outline" onClick={()=>eq.refetch()}>Retry</Button>
          </div>
        </div>
      ) : loading ? (
        /* ── Skeleton ── */
        <div className="flex-1 rounded-lg ring-1 ring-black/[0.06] bg-white overflow-hidden">
          <div className="grid h-full" style={{gridTemplateColumns:'44px repeat(7,1fr)',gridTemplateRows:'auto repeat(12,1fr)'}}>
            <div className="h-[36px] border-b border-r border-border-subtle" />
            {days.map((_,i)=>(
              <div key={i} className="h-[36px] border-b border-border-subtle flex flex-col items-center justify-center">
                <div className="h-2 w-5 animate-pulse rounded bg-gray-100 mb-0.5" />
                <div className="h-3 w-3 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
            {Array.from({length:12*7},(_,idx)=>(
              <div key={`sk-${idx}`} className="border-b border-r border-border-subtle" />
            ))}
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════
           Calendar grid — fills available space (1fr rows)
           Small-type aesthetic: compact text, fine details
           ══════════════════════════════════════════════════════ */
        <div className="flex-1 rounded-lg ring-1 ring-black/[0.06] bg-white overflow-hidden relative">
          <div className="grid h-full" style={{gridTemplateColumns:'44px repeat(7,1fr)',gridTemplateRows:'auto repeat(12,1fr)'}}>
            {/* Corner */}
            <div className="h-[36px] border-b border-r border-border-subtle" />

            {/* Day headers */}
            {days.map((d,i)=>{
              const isSprint=sprintDaysInView.includes(d.ds)
              return (
                <div key={i}
                  className={`h-[36px] flex flex-col items-center justify-center border-b border-border-subtle ${i<6?'border-r border-border-subtle':''} ${d.today?'bg-accent-50':isSprint?'bg-accent-500/[0.04]':''}`}
                  style={isSprint&&activeSprint?{borderTop:`3px solid ${activeSprint.color}`}:{}}>
                  <span className="text-[9px] font-semibold text-text-tertiary uppercase tracking-widest leading-none">{d.abbr}</span>
                  <span className={`text-[13px] font-bold leading-tight mt-0.5 ${d.today?'text-accent-500':'text-text-primary'}`}>{d.num}</span>
                </div>
              )
            })}

            {/* Time labels + cells */}
            {SLOTS.map((label,si)=>(
              <div key={si} style={{display:'contents'}}>
                {/* Label */}
                <div className="flex items-start justify-end pr-1.5 pt-1 border-b border-r border-border-subtle">
                  <span className="text-[9px] font-medium text-text-tertiary tabular-nums leading-none">{label}</span>
                </div>
                {/* 7 cells */}
                {days.map((d,di)=>{
                  const isSprint=sprintDaysInView.includes(d.ds)
                  return (
                    <button key={`c-${si}-${di}`} onClick={()=>openCreate(di,si)}
                      className={`text-left transition-colors cursor-pointer ${di<6?'border-r border-border-subtle':''} ${si<SLOT_COUNT-1?'border-b border-border-subtle':''} ${d.today?'bg-accent-50/40':isSprint?'bg-accent-500/[0.02]':''} hover:bg-accent-50/60`} />
                  )
                })}
              </div>
            ))}

            {/* Event pills */}
            {gridEvs.map(ev=>{
              const n=ev.endSlot-ev.startSlot; if(n<=0)return null
              return (
                <div key={ev.id} className="relative z-10 mx-px flex items-center"
                  style={{gridColumn:`${ev.day+2}`,gridRow:`${ev.startSlot+2}/span ${n}`}}>
                  <div className={`w-full h-[calc(100%-3px)] flex items-center rounded-[3px] px-1.5 transition-shadow hover:shadow-sm ${ev.source==='event'?'cursor-pointer':'cursor-default'}`}
                    style={{backgroundColor:ev.color}}
                    title={`${ev.title} · ${SLOTS[ev.startSlot]}–${SLOTS[ev.endSlot-1]}${ev.description?`\n${ev.description}`:''}`}
                    onClick={()=>ev.source==='event'&&openEdit(ev)}>
                    <span className="text-[10px] font-semibold text-white leading-tight truncate">{ev.title}</span>
                    {ev.source!=='event'&&<span className="ml-auto shrink-0 text-[8px] text-white/60 uppercase ml-1">{ev.source==='task'?'T':'R'}</span>}
                  </div>
                </div>
              )
            })}

            {/* Empty state */}
            {gridEvs.length===0&&(
              <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none"
                style={{gridColumn:'2/-1',gridRow:'2/-1'}}>
                <CalendarDays className="h-7 w-7 text-text-tertiary/30 mb-1.5" />
                <p className="text-xs text-text-tertiary">Clear week</p>
                <p className="text-[10px] text-text-tertiary/50 mt-0.5">Tap + or any cell</p>
              </div>
            )}
          </div>

          {/* ── FAB ── */}
          <button onClick={()=>openCreate()}
            className="absolute bottom-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg hover:bg-accent-600 hover:shadow-xl active:scale-95 transition-all cursor-pointer"
            title="Add event">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         Centered Modal — compact, properly sized
         ═══════════════════════════════════════════════════════════ */}
      {showSheet&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-full max-w-[340px] animate-modal-in" onClick={e=>e.stopPropagation()}>
            {/* Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-accent-500" />
            {/* Card */}
            <div className="rounded-xl bg-white px-5 pb-5 pt-5 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-text-primary">{editing?'Edit event':'New event'}</h2>
                <button onClick={closeSheet} className="p-1 -mr-1 text-text-tertiary hover:text-text-primary rounded-full hover:bg-bg-app transition-colors cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Title</label>
                  <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="What's the event?" autoFocus
                    className="block w-full rounded-lg border border-border-subtle px-3 py-2 text-sm placeholder:text-text-tertiary/50 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/15" />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-text-secondary uppercase tracking-wider">When</label>
                  <div className="grid grid-cols-[1fr_52px_52px] gap-2 items-start">
                    <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)}
                      className="block w-full rounded-lg border border-border-subtle px-2.5 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/15" />
                    <input type="time" value={fStart} onChange={e=>setFStart(e.target.value)}
                      className="block w-full rounded-lg border border-border-subtle px-2 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/15" />
                    <input type="time" value={fEnd} onChange={e=>setFEnd(e.target.value)}
                      className="block w-full rounded-lg border border-border-subtle px-2 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/15" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Color</label>
                  <div className="flex gap-2">
                    {EVENT_COLORS.map(c=>(
                      <button key={c} type="button" onClick={()=>setFColor(c)}
                        className={`h-6 w-6 rounded-full transition-all cursor-pointer ${fColor===c?'ring-2 ring-offset-2 ring-accent-500 scale-110':'ring-1 ring-black/[0.06] hover:scale-105'}`}
                        style={{backgroundColor:c}} />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1.5">
                  <Button size="sm" onClick={()=>editing?updateM.mutate():createM.mutate()}
                    disabled={!fTitle.trim()||!fDate||createM.isPending||updateM.isPending}
                    className="flex-1">
                    {createM.isPending||updateM.isPending?'Saving…':editing?'Save changes':'Create event'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={closeSheet}>Cancel</Button>
                  {editing&&(
                    <button onClick={()=>{setConfirmId(editing.id);closeSheet()}}
                      className="ml-auto p-2 text-text-tertiary hover:text-neg rounded-lg hover:bg-neg-bg transition-colors cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmId} title="Delete this event?" message="This can't be undone."
        onConfirm={()=>{if(confirmId)deleteM.mutate(confirmId);setConfirmId(null)}}
        onCancel={()=>setConfirmId(null)} loading={deleteM.isPending} />

      <style>{`
        @keyframes modal-in { from { opacity:0; transform:scale(.93); } to { opacity:1; transform:scale(1); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-modal-in { animation: modal-in .2s ease-out; }
        .animate-fade-in { animation: fade-in .2s ease-out; }
      `}</style>
    </div>
  )
}
