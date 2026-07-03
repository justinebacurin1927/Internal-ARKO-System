import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2, X, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

type ViewMode = 'week' | 'month' | 'year'

interface CalendarEvent {
  id: string; title: string
  day: number; startSlot: number; endSlot: number
  color: string; source: 'event' | 'task' | 'reminder'
  sourceId: string; description?: string
}

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */

const DAY_ABBRS = ['Mo','Tu','We','Th','Fr','Sa','Su']
const SLOTS = ['8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM']
const SLOT_COUNT = SLOTS.length
const EVENT_COLORS = ['#2D6A4F','#5FA87A','#C28B5E','#C2655C','#4A5B4E','#7A8B7E']
const TASK_COLOR = '#4A7B9D'; const REMINDER_COLOR = '#C28B5E'
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

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

/** Get the date range for the current view */
function viewDateRange(view: ViewMode, focus: Date): { from: string; to: string; days: {ds:string;date:Date;today:boolean;num:number}[]; label: string } {
  if (view === 'week') {
    const mon = getMonday(focus)
    const d = Array.from({length:7},(_,i)=>{const x=addDays(mon,i); return {ds:toDS(x),date:x,today:isToday(x),num:x.getDate(),abbr:DAY_ABBRS[i]}})
    return {from:toDS(mon),to:toDS(addDays(mon,6)),days:d,label:weekLabel(mon)}
  }
  if (view === 'month') {
    const y=focus.getFullYear(),m=focus.getMonth()
    const first=new Date(y,m,1)
    const start = getMonday(first)
    const monthDays = Array.from({length:42},(_,i)=>{const x=addDays(start,i); return {ds:toDS(x),date:x,today:isToday(x),num:x.getDate(),inMonth:x.getMonth()===m}})
    return {from:toDS(start),to:toDS(addDays(start,41)),days:monthDays,label:`${FULL_MONTHS[m]} ${y}`}
  }
  // year
  const y=focus.getFullYear()
  const from=toDS(new Date(y,0,1)),to=toDS(new Date(y,11,31))
  return {from,to,days:[],label:`${y}`}
}

function getMonthGrid(y: number, m: number) {
  const first=new Date(y,m,1); const start=getMonday(first)
  return Array.from({length:42},(_,i)=>{const x=addDays(start,i); return{ds:toDS(x),date:x,num:x.getDate(),today:isToday(x),inMonth:x.getMonth()===m}})
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */

export default function CalendarPage() {
  const qc = useQueryClient()

  /* ── View state ── */
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [focusDate, setFocusDate] = useState(new Date())

  const navLeft = useCallback(()=>{
    if(viewMode==='week')setFocusDate(d=>addDays(d,-7))
    else if(viewMode==='month')setFocusDate(d=>new Date(d.getFullYear(),d.getMonth()-1,1))
    else setFocusDate(d=>new Date(d.getFullYear()-1,0,1))
  },[viewMode])
  const navRight = useCallback(()=>{
    if(viewMode==='week')setFocusDate(d=>addDays(d,7))
    else if(viewMode==='month')setFocusDate(d=>new Date(d.getFullYear(),d.getMonth()+1,1))
    else setFocusDate(d=>new Date(d.getFullYear()+1,0,1))
  },[viewMode])
  const goToday = useCallback(()=>setFocusDate(new Date()),[])

  const range = useMemo(()=>viewDateRange(viewMode,focusDate),[viewMode,focusDate])

  const weekDays = useMemo(()=>{
    if(viewMode!=='week')return []
    return viewDateRange('week',focusDate).days as ({ds:string;date:Date;today:boolean;num:number;abbr:string})[]
  },[viewMode,focusDate])

  const monthDays = useMemo(()=>{
    if(viewMode!=='month')return []
    return viewDateRange('month',focusDate).days as ({ds:string;date:Date;today:boolean;num:number;inMonth:boolean})[]
  },[viewMode,focusDate])

  /* ── Data ── */
  const eq = useQuery({queryKey:['events',range.from,range.to],queryFn:()=>api.getEvents(range.from,range.to)})
  const tq = useQuery({queryKey:['tasks'],queryFn:()=>api.getTasks()})
  const rq = useQuery({queryKey:['reminders'],queryFn:()=>api.getReminders()})
  const sq = useQuery({queryKey:['sprints'],queryFn:()=>api.getSprints(true)})
  const loading = eq.isLoading
  const error = eq.error

  const apiEvs = eq.data??[]; const tasks = tq.data??[]; const reminders = rq.data??[]; const sprints = sq.data??[]
  const activeSprint = useMemo(()=>(sprints as any[]).find((s:any)=>s.is_active),[sprints])

  /* ── Events by date (for month/year views) ── */
  const eventsByDate = useMemo(()=>{
    const map = new Map<string,{color:string;title:string}[]>()
    for(const e of apiEvs){
      const d=e.date; if(!map.has(d))map.set(d,[])
      map.get(d)!.push({color:e.color||EVENT_COLORS[0],title:e.title})
    }
    for(const t of tasks){
      if(!t.due_date)continue; const d=toDS(new Date(t.due_date))
      if(!map.has(d))map.set(d,[]); map.get(d)!.push({color:TASK_COLOR,title:t.title})
    }
    for(const r of reminders){
      if(!r.due_at)continue; const d=toDS(new Date(r.due_at))
      if(!map.has(d))map.set(d,[]); map.get(d)!.push({color:REMINDER_COLOR,title:r.title})
    }
    return map
  },[apiEvs,tasks,reminders])

  /* ── Sprint helpers ── */
  const sprintProgress = useMemo(()=>{
    if(!activeSprint)return {cur:0,tot:0,pct:0}
    const tot=daysBetween(new Date(activeSprint.start_date),new Date(activeSprint.end_date))+1
    const cur=Math.min(tot,Math.max(0,daysBetween(new Date(activeSprint.start_date),new Date())+1))
    return {cur,tot,pct:tot>0?Math.round(cur/tot*100):0}
  },[activeSprint])

  function isInSprint(ds: string) {
    if(!activeSprint)return false
    const d=new Date(ds+'T00:00:00')
    return d>=new Date(activeSprint.start_date)&&d<=new Date(activeSprint.end_date)
  }

  /* ── Week grid events (merged) ── */
  const weekDaysStrs = useMemo(()=>weekDays.map(d=>d.ds),[weekDays])
  const gridEvs = useMemo(():CalendarEvent[]=>{
    const r:CalendarEvent[]=[]; let ci=0
    for(const e of apiEvs){const di=weekDaysStrs.indexOf(e.date);if(di===-1)continue
      const s=timeToSlot(e.start_time),end=Math.min(Math.max(s+1,Math.ceil(timeToSlot(e.end_time))),SLOT_COUNT)
      r.push({id:`evt-${e.id}`,title:e.title,day:di,startSlot:s,endSlot:end,color:e.color||EVENT_COLORS[ci++%EVENT_COLORS.length],source:'event',sourceId:e.id,description:e.description})}
    for(const t of tasks){
      if(!t.due_date)continue;const due=new Date(t.due_date);const di=weekDaysStrs.indexOf(toDS(due));if(di===-1)continue
      const slot=timeToSlot(due.toISOString().slice(11,16))
      r.push({id:`task-${t.id}`,title:t.title,day:di,startSlot:slot,endSlot:Math.min(slot+Math.max(1,Math.ceil(due.getMinutes()/60)+1),SLOT_COUNT),color:TASK_COLOR,source:'task',sourceId:t.id})}
    for(const r2 of reminders){
      if(!r2.due_at)continue;const due=new Date(r2.due_at);const di=weekDaysStrs.indexOf(toDS(due));if(di===-1)continue
      const slot=timeToSlot(due.toISOString().slice(11,16))
      r.push({id:`rem-${r2.id}`,title:`${r2.is_done?'✓ ':''}${r2.title}`,day:di,startSlot:slot,endSlot:Math.min(slot+1,SLOT_COUNT),color:REMINDER_COLOR,source:'reminder',sourceId:r2.id})}
    return r
  },[apiEvs,tasks,reminders,weekDaysStrs])

  /* ── Form state ── */
  const [showSheet,setShowSheet] = useState(false)
  const [editing,setEditing] = useState<any|null>(null)
  const [fTitle,setFTitle] = useState('')
  const [fDate,setFDate] = useState('')
  const [fEndDate,setFEndDate] = useState('')
  const [fStart,setFStart] = useState('09:00')
  const [fEnd,setFEnd] = useState('10:00')
  const [fColor,setFColor] = useState(EVENT_COLORS[0])
  const [confirmId,setConfirmId] = useState<string|null>(null)

  const resetF = ()=>{setFTitle('');setFDate('');setFEndDate('');setFStart('09:00');setFEnd('10:00');setFColor(EVENT_COLORS[0]);setEditing(null)}
  const openCreate = (d?:string,slotIdx?:number)=>{resetF()
    if(d)setFDate(d),setFEndDate(d)
    if(slotIdx!==undefined){setFStart(slotToTime(slotIdx));setFEnd(slotToTime(Math.min(slotIdx+1,SLOT_COUNT-1)))}
    setShowSheet(true)}
  const openEdit = (ev:CalendarEvent)=>{
    const o=apiEvs.find((e:any)=>`evt-${e.id}`===ev.id)
    if(o){setEditing(o);setFTitle(o.title);setFDate(o.date);setFEndDate(o.end_date||o.date);setFStart(o.start_time);setFEnd(o.end_time);setFColor(o.color||EVENT_COLORS[0]);setShowSheet(true)}}
  const closeSheet = ()=>{setShowSheet(false);resetF()}

  const createM = useMutation({mutationFn:()=>api.createEvent({title:fTitle.trim(),date:fDate,end_date:fEndDate||null,start_time:fStart,end_time:fEnd,color:fColor}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['events']});closeSheet()}})
  const updateM = useMutation({mutationFn:()=>api.updateEvent(editing!.id,{title:fTitle.trim(),date:fDate,end_date:fEndDate||null,start_time:fStart,end_time:fEnd,color:fColor}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['events']});closeSheet()}})
  const deleteM = useMutation({mutationFn:(id:string)=>api.deleteEvent(id),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['events']})}})

  /* ══════════════════════════════════════════════════════════════ */
  /*  Render                                                     */
  /* ══════════════════════════════════════════════════════════════ */

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
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center rounded-lg bg-black/[0.04] p-0.5">
            {(['week','month','year'] as ViewMode[]).map(m=>(
              <button key={m} onClick={()=>setViewMode(m)}
                className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all cursor-pointer ${viewMode===m?'bg-white text-text-primary shadow-xs':'text-text-tertiary hover:text-text-secondary'}`}>
                {m}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={goToday}>
            <CalendarDays className="h-3 w-3" /> Today
          </Button>
          <div className="flex items-center rounded-lg border border-border-subtle">
            <button onClick={navLeft} className="p-1 text-text-tertiary hover:text-text-primary hover:bg-bg-app transition-colors rounded-l-lg cursor-pointer">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2.5 py-1 text-[11px] font-medium text-text-secondary tabular-nums border-x border-border-subtle min-w-[130px] text-center select-none">
              {range.label}
            </span>
            <button onClick={navRight} className="p-1 text-text-tertiary hover:text-text-primary hover:bg-bg-app transition-colors rounded-r-lg cursor-pointer">
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
        <div className="flex-1 rounded-lg ring-1 ring-black/[0.06] bg-white overflow-hidden">
          <div className="grid h-full" style={{gridTemplateColumns:'44px repeat(7,1fr)',gridTemplateRows:'auto repeat(12,1fr)'}}>
            <div className="h-[36px] border-b border-r border-border-subtle" />
            {Array.from({length:7},(_,i)=>(
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
      ) : viewMode==='week' ? (
        <WeekView weekDays={weekDays as any[]} sprint={activeSprint} events={gridEvs} onCellClick={openCreate} onEventClick={openEdit} isInSprint={isInSprint} />
      ) : viewMode==='month' ? (
        <MonthView days={monthDays as any[]} eventsByDate={eventsByDate} onDayClick={d=>openCreate(d)} isInSprint={isInSprint} />
      ) : (
        <YearView focusYear={focusDate.getFullYear()} eventsByDate={eventsByDate} onMonthClick={(y,m)=>setFocusDate(new Date(y,m,1))} />
      )}

      {/* ══════════════════════════════════════════════════════════
         FAB — shown in week & month views
         ══════════════════════════════════════════════════════════ */}
      {viewMode!=='year' && !loading && !error && (
        <button onClick={()=>openCreate()} className="fixed bottom-6 right-6 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg hover:bg-accent-600 hover:shadow-xl active:scale-95 transition-all cursor-pointer" title="Add event">
          <Plus className="h-5 w-5" />
        </button>
      )}

      {/* ══════════════════════════════════════════════════════════
         Modal
         ══════════════════════════════════════════════════════════ */}
      {showSheet&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-full max-w-[420px] mx-4 animate-modal-in" onClick={e=>e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-accent-500" />
            <div className="rounded-xl bg-white px-6 pb-6 pt-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-bold text-text-primary">{editing?'Edit event':'New event'}</h2>
                <button onClick={closeSheet} className="p-1.5 -mr-1.5 text-text-tertiary hover:text-text-primary rounded-full hover:bg-bg-app transition-colors cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Title</label>
                  <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="What's the event?" autoFocus
                    className="block w-full rounded-lg border border-border-subtle px-3.5 py-2.5 text-sm placeholder:text-text-tertiary/50 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/15" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-text-secondary uppercase tracking-wider">From</label>
                  <div className="grid grid-cols-[1fr_100px] gap-3">
                    <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)}
                      className="block w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/15" />
                    <input type="time" value={fStart} onChange={e=>setFStart(e.target.value)}
                      className="block w-full rounded-lg border border-border-subtle px-2.5 py-2.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/15" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-text-secondary uppercase tracking-wider">To</label>
                  <div className="grid grid-cols-[1fr_100px] gap-3">
                    <input type="date" value={fEndDate} onChange={e=>setFEndDate(e.target.value)}
                      className="block w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/15" />
                    <input type="time" value={fEnd} onChange={e=>setFEnd(e.target.value)}
                      className="block w-full rounded-lg border border-border-subtle px-2.5 py-2.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/15" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Color</label>
                  <div className="flex gap-3">
                    {EVENT_COLORS.map(c=>(
                      <button key={c} type="button" onClick={()=>setFColor(c)}
                        className={`h-7 w-7 rounded-full transition-all cursor-pointer ${fColor===c?'ring-2 ring-offset-2 ring-accent-500 scale-110':'ring-1 ring-black/[0.06] hover:scale-105'}`}
                        style={{backgroundColor:c}} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Button size="default" onClick={()=>editing?updateM.mutate():createM.mutate()}
                    disabled={!fTitle.trim()||!fDate||createM.isPending||updateM.isPending} className="flex-1">
                    {createM.isPending||updateM.isPending?'Saving…':editing?'Save changes':'Create event'}
                  </Button>
                  <Button size="default" variant="ghost" onClick={closeSheet}>Cancel</Button>
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
        onConfirm={()=>{if(confirmId)deleteM.mutate(confirmId);setConfirmId(null)}} onCancel={()=>setConfirmId(null)} loading={deleteM.isPending} />

      <style>{`
        @keyframes modal-in { from { opacity:0; transform:scale(.93); } to { opacity:1; transform:scale(1); } }
        @keyframes fade-in { from { opacity:0; } to { opacity:1; } }
        .animate-modal-in { animation:modal-in .2s ease-out; }
        .animate-fade-in { animation:fade-in .2s ease-out; }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Week View (existing time-slot grid)
   ═══════════════════════════════════════════════ */

function WeekView({weekDays,sprint,events,onCellClick,onEventClick,isInSprint}:{
  weekDays: ({ds:string;date:Date;today:boolean;num:number;abbr:string})[]
  sprint:any; events:CalendarEvent[]
  onCellClick:(d?:string,slotIdx?:number)=>void; onEventClick:(ev:CalendarEvent)=>void
  isInSprint:(ds:string)=>boolean
}) {
  return (
    <div className="flex-1 rounded-lg ring-1 ring-black/[0.06] bg-white overflow-hidden relative">
      <div className="grid h-full" style={{gridTemplateColumns:'44px repeat(7,1fr)',gridTemplateRows:'auto repeat(12,1fr)'}}>
        <div className="h-[36px] border-b border-r border-border-subtle" />
        {weekDays.map((d,i)=>{
          const sp=isInSprint(d.ds)
          return (
            <div key={i}
              className={`h-[36px] flex flex-col items-center justify-center border-b border-border-subtle ${i<6?'border-r border-border-subtle':''} ${d.today?'bg-accent-50':sp?'bg-accent-500/[0.04]':''}`}
              style={sp&&sprint?{borderTop:`3px solid ${sprint.color}`}:{}}>
              <span className="text-[9px] font-semibold text-text-tertiary uppercase tracking-widest leading-none">{d.abbr}</span>
              <span className={`text-[13px] font-bold leading-tight mt-0.5 ${d.today?'text-accent-500':'text-text-primary'}`}>{d.num}</span>
            </div>
          )
        })}
        {SLOTS.map((label,si)=>(
          <div key={si} style={{display:'contents'}}>
            <div className="flex items-start justify-end pr-1.5 pt-1 border-b border-r border-border-subtle">
              <span className="text-[9px] font-medium text-text-tertiary tabular-nums leading-none">{label}</span>
            </div>
            {weekDays.map((d,di)=>(
              <button key={`c-${si}-${di}`} onClick={()=>onCellClick(d.ds,si)}
                className={`text-left transition-colors cursor-pointer ${di<6?'border-r border-border-subtle':''} ${si<SLOT_COUNT-1?'border-b border-border-subtle':''} ${d.today?'bg-accent-50/40':isInSprint(d.ds)?'bg-accent-500/[0.02]':''} hover:bg-accent-50/60`} />
            ))}
          </div>
        ))}
        {events.map(ev=>{
          const n=ev.endSlot-ev.startSlot; if(n<=0)return null
          return (
            <div key={ev.id} className="relative z-10 mx-px flex items-center"
              style={{gridColumn:`${ev.day+2}`,gridRow:`${ev.startSlot+2}/span ${n}`}}>
              <div className={`w-full h-[calc(100%-3px)] flex items-center rounded-[3px] px-1.5 transition-shadow hover:shadow-sm ${ev.source==='event'?'cursor-pointer':'cursor-default'}`}
                style={{backgroundColor:ev.color}}
                title={`${ev.title} · ${SLOTS[ev.startSlot]}–${SLOTS[ev.endSlot-1]}${ev.description?`\n${ev.description}`:''}`}
                onClick={()=>ev.source==='event'&&onEventClick(ev)}>
                <span className="text-[10px] font-semibold text-white leading-tight truncate">{ev.title}</span>
                {ev.source!=='event'&&<span className="ml-auto shrink-0 text-[8px] text-white/60 uppercase ml-1">{ev.source==='task'?'T':'R'}</span>}
              </div>
            </div>
          )
        })}
        {events.length===0&&(
          <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none" style={{gridColumn:'2/-1',gridRow:'2/-1'}}>
            <CalendarDays className="h-7 w-7 text-text-tertiary/30 mb-1.5" />
            <p className="text-xs text-text-tertiary">Clear week</p>
            <p className="text-[10px] text-text-tertiary/50 mt-0.5">Tap + or any cell</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Month View
   ═══════════════════════════════════════════════ */

function MonthView({days,eventsByDate,onDayClick,isInSprint}:{
  days: ({ds:string;date:Date;today:boolean;num:number;inMonth:boolean})[]
  eventsByDate: Map<string,{color:string;title:string}[]>
  onDayClick:(d:string)=>void
  isInSprint:(ds:string)=>boolean
}) {
  return (
    <div className="flex-1 rounded-lg ring-1 ring-black/[0.06] bg-white overflow-hidden">
      <div className="grid h-full auto-rows-1fr" style={{gridTemplateColumns:'repeat(7,1fr)'}}>
        {/* Day headers */}
        {DAY_ABBRS.map((a,i)=>(
          <div key={i} className="h-[30px] flex items-center justify-center border-b border-border-subtle">
            <span className="text-[9px] font-semibold text-text-tertiary uppercase tracking-widest">{a}</span>
          </div>
        ))}
        {/* Day cells */}
        {days.map((d,i)=>{
          const evs=eventsByDate.get(d.ds)??[]
          const sp=isInSprint(d.ds)
          return (
            <button key={i} onClick={()=>onDayClick(d.ds)}
              className={`flex flex-col items-start justify-start p-1.5 text-left transition-colors cursor-pointer ${(i%7!==6)?'border-r border-border-subtle':''} border-b border-border-subtle ${d.today?'bg-accent-50':sp?'bg-accent-500/[0.03]':!d.inMonth?'opacity-30':''} hover:bg-accent-50/50`}>
              <span className={`text-[11px] font-semibold leading-none ${d.today?'text-accent-500':''}`}>{d.num}</span>
              {evs.length>0&&(
                <div className="flex flex-wrap gap-px mt-auto pt-1">
                  {evs.slice(0,4).map((ev,ei)=>(
                    <div key={ei} className="h-[5px] w-[5px] rounded-full" style={{backgroundColor:ev.color}} />
                  ))}
                  {evs.length>4&&<span className="text-[8px] text-text-tertiary font-medium leading-none">+{evs.length-4}</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Year View
   ═══════════════════════════════════════════════ */

function YearView({focusYear,eventsByDate,onMonthClick}:{
  focusYear:number
  eventsByDate: Map<string,{color:string;title:string}[]>
  onMonthClick:(y:number,m:number)=>void
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-3 gap-4">
        {Array.from({length:12},(_,m)=>{
          const days=getMonthGrid(focusYear,m)
          const evCount = days.reduce((sum,d)=>sum+(eventsByDate.get(d.ds)?.length??0),0)
          return (
            <button key={m} onClick={()=>onMonthClick(focusYear,m)}
              className="rounded-lg bg-white ring-1 ring-black/[0.06] p-3 text-left transition-shadow hover:shadow-md cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-text-primary">{MONTH_NAMES[m]}</span>
                {evCount>0&&<span className="text-[9px] text-text-tertiary font-medium">{evCount}</span>}
              </div>
              <div className="grid grid-cols-7 gap-0">
                {['Mo','Tu','We','Th','Fr','Sa','Su'].map(a=>(
                  <span key={a} className="text-[7px] font-semibold text-text-tertiary text-center leading-none mb-0.5">{a[0]}</span>
                ))}
                {days.map((d,i)=>{
                  const hasEvent=eventsByDate.has(d.ds)
                  return (
                    <div key={i}
                      className={`text-center text-[8px] py-0.5 leading-none rounded-sm ${d.today?'bg-accent-500/10 font-bold text-accent-500':'text-text-tertiary/80'} ${!d.inMonth?'opacity-20':''}`}>
                      {d.inMonth&&<span>{d.num}</span>}
                      {hasEvent&&d.inMonth&&<div className="flex justify-center"><div className="h-[2px] w-[2px] rounded-full bg-accent-500/20" /></div>}
                    </div>
                  )
                })}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
