import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, getToken } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../lib/toast'
import {
  Send, Search, Plus, Loader2, AlertCircle, MessageSquare,
  Check, X, Pencil, Trash2, Users,
} from 'lucide-react'

/* ─── Helpers ─── */

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateHeading(date: string) {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
}

function conversationLabel(participants: any[], currentUserId: string | undefined): { name: string; subtitle?: string; isGroup: boolean } {
  const others = participants?.filter((p: any) => p.id !== currentUserId) ?? []
  if (!others.length) return { name: 'Just you', isGroup: false }
  if (participants.length === 2) return { name: others[0].name || others[0].email, isGroup: false }
  const names = others.map((p: any) => p.name || p.email?.split('@')[0] || 'Unknown')
  if (names.length <= 2) return { name: names.join(', '), isGroup: true }
  return { name: names[0], subtitle: `${names[0]}, ${names[1]} +${names.length - 2} others`, isGroup: true }
}

/* ─── Avatar ─── */

function Avatar({ name, email, size = 'md' }: { name?: string; email?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-10 w-10 text-sm' }
  const initial = (name || email || '?').charAt(0).toUpperCase()
  return (
    <div className={`${sizes[size]} rounded-full bg-accent-50 text-accent-600 flex items-center justify-center font-semibold shrink-0`}>
      {initial}
    </div>
  )
}

/* ─── Group avatar (stacked initials for groups) ─── */

function GroupAvatar({ participants, currentUserId }: { participants: any[]; currentUserId: string | undefined }) {
  const others = participants?.filter((p: any) => p.id !== currentUserId) ?? []
  const initials = others.slice(0, 2).map((p: any) => (p.name || p.email || '?').charAt(0).toUpperCase())
  return (
    <div className="relative h-9 w-9 shrink-0">
      <div className="absolute top-0 left-0 h-5 w-5 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-[9px] font-bold border-2 border-white">
        {initials[0] || '?'}
      </div>
      <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[9px] font-bold border-2 border-white">
        {initials[1] || '?'}
      </div>
    </div>
  )
}

/* ─── Conversation list item ─── */

function ConvItem({
  conv,
  isSelected,
  onClick,
  currentUserId,
}: {
  conv: any
  isSelected: boolean
  onClick: () => void
  currentUserId: string | undefined
}) {
  const label = conversationLabel(conv.participants, currentUserId)
  const lastMsg = conv.messages?.[0]
  const unread = conv.unread_count ?? 0
  return (
    <button
      onClick={onClick}
      className="w-full text-left group transition-colors relative"
      style={{
        borderLeft: isSelected ? '3px solid #2D6A4F' : '3px solid transparent',
        background: isSelected ? 'rgba(45,106,79,0.04)' : 'transparent',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="relative shrink-0">
          {label.isGroup ? (
            <GroupAvatar participants={conv.participants} currentUserId={currentUserId} />
          ) : (
            <Avatar name={label.name} email={label.name} />
          )}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none shadow-md ring-2 ring-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm truncate flex items-center gap-1.5 ${unread > 0 ? 'font-bold text-text-primary' : isSelected ? 'font-semibold text-text-primary' : 'font-medium text-text-primary'}`}>
              {label.name}
              {label.isGroup && <Users className="h-3 w-3 text-text-tertiary shrink-0" />}
            </p>
            {lastMsg && (
              <span className="text-[11px] text-text-tertiary shrink-0 tabular-nums">{timeAgo(lastMsg.created_at)}</span>
            )}
          </div>
          {label.subtitle ? (
            <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'font-semibold text-text-primary' : 'text-text-tertiary'}`}>{label.subtitle}</p>
          ) : lastMsg?.content ? (
            <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'font-semibold text-text-primary' : 'text-text-tertiary'}`}>{lastMsg.content}</p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

/* ─── Message bubble ─── */

function MessageBubble({
  msg,
  isMe,
  onEdit,
  onDelete,
}: {
  msg: any
  isMe: boolean
  onEdit: (msg: any) => void
  onDelete: (msg: any) => void
}) {
  const [showActions, setShowActions] = useState(false)
  return (
    <div
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-[fade-in_0.2s_ease-out] group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isMe && (
        <div className="mr-2 self-end mb-1">
          <Avatar name={msg.sender_name} size="sm" />
        </div>
      )}
      <div className="max-w-[75%] flex flex-col">
        <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <div
            className={`text-left rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-shadow duration-200 ${
              msg.edited ? 'italic' : ''
            } ${
              isMe
                ? 'bg-accent-500 text-white rounded-br-md'
                : 'bg-white text-text-primary border border-border-subtle rounded-bl-md shadow-[0_1px_2px_rgba(26,29,26,0.04)]'
            }`}
          >
            {msg.content}
            {msg.edited && (
              <span className={`text-[10px] ml-1.5 ${isMe ? 'text-accent-200' : 'text-text-tertiary'}`}>(edited)</span>
            )}
          </div>

          {/* Hover actions — own messages only */}
          {isMe && (
            <div
              className={`flex gap-0.5 transition-opacity duration-150 ${
                showActions ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <button
                onClick={() => onEdit(msg)}
                className="p-1 rounded-md hover:bg-gray-100 text-text-tertiary hover:text-text-primary transition-colors"
                title="Edit"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDelete(msg)}
                className="p-1 rounded-md hover:bg-red-50 text-text-tertiary hover:text-neg transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        <p className={`text-[11px] mt-0.5 tabular-nums ${isMe ? 'text-text-tertiary text-right mr-1' : 'text-text-tertiary ml-1'}`}>
          {formatTime(msg.created_at)}
        </p>
      </div>
    </div>
  )
}

/* ─── Inline edit message ─── */

function EditMessageInput({
  msg,
  onSave,
  onCancel,
}: {
  msg: any
  onSave: (id: number, content: string) => void
  onCancel: () => void
}) {
  const [val, setVal] = useState(msg.content)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.setSelectionRange(val.length, val.length)
  }, [])

  return (
    <div className="flex justify-end animate-[fade-in_0.15s_ease-out]">
      <div className="max-w-[75%] w-full">
        <div className="flex items-center gap-2 rounded-2xl bg-accent-50 border border-accent-200 px-3 py-2">
          <input
            ref={ref}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && val.trim()) onSave(msg.id, val.trim())
              if (e.key === 'Escape') onCancel()
            }}
            className="flex-1 bg-transparent text-sm text-text-primary focus:outline-none"
          />
          <button
            onClick={() => val.trim() && onSave(msg.id, val.trim())}
            disabled={!val.trim()}
            className="p-1 rounded-md hover:bg-accent-100 text-accent-600 disabled:opacity-30 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-accent-100 text-text-tertiary transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Day divider ─── */

function DayDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border-subtle" />
      <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider shrink-0">{formatDateHeading(date)}</span>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  )
}

/* ─── Page ─── */

export default function MessagesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedConv, setSelectedConv] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [convSearch, setConvSearch] = useState('')
  const [showNewConv, setShowNewConv] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null)
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<number | null>(null)
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; timeout: NodeJS.Timeout }>>({})
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── WebSocket connection ──
  useEffect(() => {
    const token = getToken()
    if (!token) return

    // In dev: connect directly to Django on :8000 (Vite proxy blocks WS upgrades)
    // In prod: would be the same host via nginx/vercel
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const wsHost = isDev ? 'localhost:8000' : window.location.host
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProto}//${wsHost}/ws/chat/?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'new_message') {
          // Refresh conversations and messages
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
          if (data.conversation_id === selectedConv) {
            queryClient.invalidateQueries({ queryKey: ['messages', selectedConv] })
          }
        } else if (data.type === 'typing') {
          if (data.user_id !== user?.id) {
            setTypingUsers((prev) => {
              const next = { ...prev }
              if (next[data.conversation_id]) {
                clearTimeout(next[data.conversation_id].timeout)
              }
              next[data.conversation_id] = {
                name: data.user_name,
                timeout: setTimeout(() => {
                  setTypingUsers((p) => {
                    const cp = { ...p }
                    delete cp[data.conversation_id]
                    return cp
                  })
                }, 3000),
              }
              return next
            })
          }
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => { wsRef.current = null }
    return () => { ws.close(); wsRef.current = null }
  }, [user?.id, queryClient])

  // ── Send typing indicator ──
  const typingThrottle = useRef<number>(0)
  const sendTyping = useCallback(() => {
    const now = Date.now()
    if (now - typingThrottle.current < 2000) return
    typingThrottle.current = now
    if (wsRef.current?.readyState === WebSocket.OPEN && selectedConv) {
      wsRef.current.send(JSON.stringify({ action: 'typing', conversation_id: selectedConv }))
    }
  }, [selectedConv])

  // ── Mark conversation as read ──
  const markRead = useMutation({
    mutationFn: (convId: string) => api.markConversationRead(convId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const handleSelectConv = useCallback((convId: string) => {
    setSelectedConv(convId)
    markRead.mutate(convId)
  }, [markRead])

  // ── Poll conversations for unread count updates (every 30s) ──
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }, 30000)
    return () => clearInterval(interval)
  }, [queryClient])

  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    refetchOnWindowFocus: true,
  })

  const { data: messagesData, isLoading: msgsLoading } = useQuery({
    queryKey: ['messages', selectedConv],
    queryFn: () => api.getMessages(selectedConv!),
    enabled: !!selectedConv,
  })

  const { data: searchResults } = useQuery({
    queryKey: ['users', 'search', userSearchQuery],
    queryFn: () => api.searchUsers(userSearchQuery),
    enabled: showNewConv && userSearchQuery.length > 0,
  })

  // Filter conversations by sidebar search
  const filteredConversations = (conversations ?? []).filter((c: any) => {
    if (!convSearch) return true
    const q = convSearch.toLowerCase()
    const others = c.participants?.filter((p: any) => p.id !== user?.id) ?? []
    const matchesName = others.some((p: any) =>
      (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q),
    )
    const matchesMsg = c.messages?.some((m: any) => m.content?.toLowerCase().includes(q))
    return matchesName || matchesMsg
  })

  const sendMsg = useMutation({
    mutationFn: (content: string) => api.sendMessage(selectedConv!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setMessage('')
      setTimeout(() => { textareaRef.current?.focus(); autoResize() }, 50)
    },
  })

  const editMsg = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      api.editMessage(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv] })
      setEditingMsgId(null)
      toast('Message updated')
    },
  })

  const deleteMsg = useMutation({
    mutationFn: (id: number) => api.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setConfirmDeleteMsgId(null)
      toast('Message deleted')
    },
  })

  const createConv = useMutation({
    mutationFn: (participantIds: string[]) => api.createConversation(participantIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setSelectedConv(data.id)
      setShowNewConv(false)
      setUserSearchQuery('')
      setSelectedUsers([])
      toast('Conversation started')
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesData?.messages])

  useEffect(() => {
    if (selectedConv) setTimeout(() => textareaRef.current?.focus(), 100)
  }, [selectedConv])

  const otherParticipant = (conv: any) =>
    conv.participants?.find((p: any) => p.id !== user?.id)

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const selectedConvData = conversations?.find((c: any) => c.id === selectedConv)
  const otherUser = selectedConvData ? otherParticipant(selectedConvData) : null
  const isGroupConv = selectedConvData && (selectedConvData.participants?.length ?? 0) > 2
  const typingName = selectedConv ? typingUsers[selectedConv]?.name : null

  // Group messages by day
  const groupedMessages = messagesData?.messages?.reduce((groups: any[], msg: any) => {
    const dateKey = new Date(msg.created_at).toDateString()
    const last = groups[groups.length - 1]
    if (last && last.dateKey === dateKey) {
      last.messages.push(msg)
    } else {
      groups.push({ dateKey, date: msg.created_at, messages: [msg] })
    }
    return groups
  }, []) ?? []

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <div className="flex items-center gap-3 p-5">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm font-medium text-red-800">Failed to load conversations</p>
        </div>
      </Card>
    )
  }

  /* ────────────────────────────────────── */
  /*          New conversation search        */
  /* ────────────────────────────────────── */

  if (showNewConv) {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-start justify-between shrink-0">
          <div>
            <h1 className="text-base font-bold text-text-primary tracking-tight">Messages</h1>
            <p className="text-xs text-text-tertiary mt-0.5">Start a new conversation</p>
          </div>
          <Button variant="ghost" onClick={() => { setShowNewConv(false); setUserSearchQuery(''); setSelectedUsers([]) }}>
            Cancel
          </Button>
        </div>

        <Card>
          <div className="p-5 space-y-3">
            {/* Selected users pills */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((u: any) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-50 text-accent-700 px-2.5 py-1 text-xs font-medium"
                  >
                    {u.name || u.email}
                    <button onClick={() => setSelectedUsers(selectedUsers.filter((s: any) => s.id !== u.id))}>
                      <X className="h-3 w-3 hover:text-neg transition-colors" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <input
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search users..."
                autoFocus
                className="block w-full rounded-lg border border-border-subtle pl-9 pr-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-white"
              />
            </div>

            {/* Results */}
            {userSearchQuery && searchResults?.length === 0 && (
              <p className="text-sm text-text-tertiary py-6 text-center">No users found</p>
            )}
            {searchResults
              ?.filter((u: any) => !selectedUsers.find((s: any) => s.id === u.id))
              .map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUsers([...selectedUsers, u])}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors"
                >
                  <Avatar name={u.name} email={u.email} />
                  <div>
                    <p className="font-medium text-text-primary text-sm">{u.name || u.email}</p>
                    {u.name && <p className="text-xs text-text-tertiary">{u.email}</p>}
                  </div>
                </button>
              ))}

            {/* Start button */}
            {selectedUsers.length > 0 && (
              <Button
                onClick={() => createConv.mutate(selectedUsers.map((u: any) => u.id))}
                disabled={createConv.isPending}
                className="w-full"
              >
                {createConv.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Start {selectedUsers.length === 1 ? 'conversation' : 'group conversation'}
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    )
  }

  /* ────────────────────────────────────── */
  /*             Main chat view              */
  /* ────────────────────────────────────── */

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Heading */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-text-primary tracking-tight">Messages</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Chat with your team</p>
        </div>
        <Button onClick={() => setShowNewConv(true)}>
          <Plus className="h-4 w-4" />
          New conversation
        </Button>
      </div>

      {/* Main card */}
      <Card className="flex-1 min-h-0 overflow-hidden flex flex-row">
        {/* ── Conversation list ── */}
        <div className="w-72 xl:w-80 shrink-0 border-r border-border-subtle flex flex-col bg-black/[0.01]">
          <div className="px-4 py-3 border-b border-border-subtle">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
              <input
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Search conversations..."
                className="block w-full rounded-md border border-border-subtle pl-8 pr-2.5 py-1.5 text-xs focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-white transition-colors"
              />
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#D8DCD6 transparent' }}
          >
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-gray-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 rounded bg-gray-100" />
                      <div className="h-2.5 w-20 rounded bg-gray-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="h-10 w-10 rounded-full bg-accent-50 flex items-center justify-center mb-3">
                  <MessageSquare className="h-5 w-5 text-accent-500" />
                </div>
                {convSearch ? (
                  <p className="text-sm text-text-tertiary">No conversations match your search</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-text-primary">No conversations yet</p>
                    <p className="text-xs text-text-tertiary mt-1">Click "New conversation" to start chatting</p>
                  </>
                )}
              </div>
            ) : (
              filteredConversations.map((conv: any) => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  isSelected={selectedConv === conv.id}
                  onClick={() => handleSelectConv(conv.id)}
                  currentUserId={user?.id}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Chat panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedConv ? (
            /* No conversation selected */
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="text-center max-w-sm">
                <div className="h-14 w-14 mx-auto mb-4 rounded-full bg-accent-50 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-accent-400" />
                </div>
                <h2 className="text-base font-semibold text-text-primary">Your messages</h2>
                <p className="text-sm text-text-tertiary mt-1.5 leading-relaxed">
                  Select a conversation from the sidebar, or start a new one to begin chatting with your team.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-5 py-3.5 border-b border-border-subtle flex items-center gap-3 shrink-0">
                {isGroupConv ? (
                  <GroupAvatar participants={selectedConvData?.participants ?? []} currentUserId={user?.id} />
                ) : (
                  <Avatar name={otherUser?.name} email={otherUser?.email} size="lg" />
                )}
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {isGroupConv
                      ? conversationLabel(selectedConvData?.participants ?? [], user?.id).name
                      : otherUser?.name || otherUser?.email}
                  </p>
                  {typingName ? (
                    <p className="text-xs text-accent-500 animate-pulse font-medium">{typingName} is typing...</p>
                  ) : isGroupConv ? (
                    <p className="text-xs text-text-tertiary">
                      {selectedConvData?.participants
                        ?.filter((p: any) => p.id !== user?.id)
                        .map((p: any) => p.name || p.email)
                        .join(', ')}
                    </p>
                  ) : otherUser?.name ? (
                    <p className="text-xs text-text-tertiary">{otherUser.email}</p>
                  ) : null}
                </div>
              </div>

              {/* Messages area */}
              <div
                className="flex-1 overflow-y-auto px-5 py-4"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#D8DCD6 transparent' }}
              >
                {msgsLoading ? (
                  <div className="space-y-3 py-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} animate-pulse`}>
                        <div className={`h-12 rounded-2xl ${i % 2 === 0 ? 'w-48 bg-accent-500/20' : 'w-36 bg-gray-100'}`} />
                      </div>
                    ))}
                  </div>
                ) : messagesData?.messages?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-10 w-10 rounded-full bg-accent-50 flex items-center justify-center mb-3">
                      <Send className="h-4 w-4 text-accent-400" />
                    </div>
                    <p className="text-sm font-medium text-text-primary">No messages yet</p>
                    <p className="text-xs text-text-tertiary mt-1">Send a message to start the conversation</p>
                  </div>
                ) : (
                  groupedMessages.map((group: any) => (
                    <div key={group.dateKey}>
                      <DayDivider date={group.date} />
                      <div className="space-y-2">
                        {group.messages.map((msg: any) => {
                          if (editingMsgId === msg.id) {
                            return (
                              <EditMessageInput
                                key={msg.id}
                                msg={msg}
                                onSave={(id, content) => editMsg.mutate({ id, content })}
                                onCancel={() => setEditingMsgId(null)}
                              />
                            )
                          }
                          return (
                            <MessageBubble
                              key={msg.id}
                              msg={msg}
                              isMe={msg.sender === user?.id}
                              onEdit={() => setEditingMsgId(msg.id)}
                              onDelete={() => setConfirmDeleteMsgId(msg.id)}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="px-5 py-3.5 border-t border-border-subtle shrink-0 bg-white">
                <form
                  onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMsg.mutate(message.trim()) }}
                  className="flex gap-3 items-end"
                >
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => { setMessage(e.target.value); autoResize(); sendTyping() }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          if (message.trim()) sendMsg.mutate(message.trim())
                        }
                      }}
                      placeholder="Type a message..."
                      rows={1}
                      className="block w-full rounded-lg border border-border-subtle px-3.5 py-2.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 bg-white resize-none overflow-hidden"
                      style={{ minHeight: '40px', maxHeight: '120px' }}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!message.trim() || sendMsg.isPending}
                    size="icon"
                    className="shrink-0"
                  >
                    {sendMsg.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={!!confirmDeleteMsgId}
        title="Delete message?"
        message="Are you sure you want to delete this message? This cannot be undone."
        onConfirm={() => { if (confirmDeleteMsgId) deleteMsg.mutate(confirmDeleteMsgId) }}
        onCancel={() => setConfirmDeleteMsgId(null)}
        loading={deleteMsg.isPending}
      />
    </div>
  )
}
