'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, Button } from '@arko/ui'
import {
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  Users,
  Check,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { api } from '../../../lib/trpc/client'
import { formatPresence } from '../../../lib/presence'

const OpenPeepsAvatar = dynamic(
  () => import('../../../components/open-peeps-avatar').then((m) => ({ default: m.OpenPeepsAvatar })),
  { ssr: false },
)

type AvatarUser = { id: string; name?: string | null; avatar?: unknown } | undefined

function Avatar({ user, size = 36 }: { user: AvatarUser; size?: number }) {
  return (
    <OpenPeepsAvatar
      userId={user?.id}
      avatarJson={user?.avatar ? JSON.stringify(user.avatar) : undefined}
      size={size}
    />
  )
}

export default function MessagesPage() {
  const [selectedConv, setSelectedConv] = useState<string | null>(null)
  const [newMsg, setNewMsg] = useState('')
  const [showNewConv, setShowNewConv] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newConversationType, setNewConversationType] = useState<'direct' | 'group'>('direct')
  const [groupName, setGroupName] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  const { data: conversations, isLoading, error } = api.messages.listConversations.useQuery(
    undefined,
    { refetchInterval: 3000, refetchIntervalInBackground: false },
  )
  const { data: messages, isLoading: msgsLoading } = api.messages.getMessages.useQuery(
    { conversationId: selectedConv!, limit: 50 },
    { enabled: !!selectedConv, refetchInterval: 1500, refetchIntervalInBackground: false },
  )
  const { data: users } = api.users.search.useQuery(
    { query: searchQuery || undefined },
    { enabled: showNewConv },
  )
  const { data: suggestions } = api.messages.suggestions.useQuery(undefined, {
    enabled: !selectedConv,
  })

  const utils = api.useUtils()
  const messageQueryInput = selectedConv
    ? { conversationId: selectedConv, limit: 50 }
    : null

  const sendMsg = api.messages.sendMessage.useMutation({
    onMutate: async (input) => {
      if (!messageQueryInput || !currentUserId) return

      await utils.messages.getMessages.cancel(messageQueryInput)
      const previous = utils.messages.getMessages.getData(messageQueryInput)
      const optimisticId = `pending-${Date.now()}`

      utils.messages.getMessages.setData(messageQueryInput, (current) => ({
        messages: [
          ...(current?.messages ?? []),
          {
            id: optimisticId,
            content: input.content,
            conversationId: input.conversationId,
            senderId: currentUserId,
            createdAt: new Date(),
            sender: {
              id: currentUserId,
              name: session?.user?.name ?? 'You',
              image: session?.user?.image ?? null,
            },
          },
        ],
        nextCursor: current?.nextCursor,
      }))
      setNewMsg('')

      return { previous, optimisticId, queryInput: messageQueryInput }
    },
    onError: (_error, input, context) => {
      if (context?.queryInput) {
        utils.messages.getMessages.setData(context.queryInput, context.previous)
      }
      setNewMsg(input.content)
    },
    onSuccess: (message, _input, context) => {
      if (context?.queryInput) {
        utils.messages.getMessages.setData(context.queryInput, (current) => ({
          messages: (current?.messages ?? []).map((item) =>
            item.id === context.optimisticId ? message : item,
          ),
          nextCursor: current?.nextCursor,
        }))
      }
      utils.messages.listConversations.invalidate()
      utils.messages.unreadCount.invalidate()
    },
    onSettled: (_data, _error, _input, context) => {
      if (context?.queryInput) {
        utils.messages.getMessages.invalidate(context.queryInput)
      }
    },
  })

  const createConv = api.messages.createConversation.useMutation({
    onSuccess: (conv) => {
      // Refetch the list so the new conversation resolves and opens immediately.
      utils.messages.listConversations.invalidate()
      utils.messages.suggestions.invalidate()
      setSelectedConv(conv.id)
      setShowNewConv(false)
      setSelectedUserIds([])
      setSearchQuery('')
    },
  })

  const createGroup = api.messages.createGroupConversation.useMutation({
    onSuccess: (conv) => {
      utils.messages.listConversations.invalidate()
      setSelectedConv(conv.id)
      setShowNewConv(false)
      setSelectedUserIds([])
      setGroupName('')
      setSearchQuery('')
    },
  })

  const { mutate: markConversationRead } = api.messages.markRead.useMutation({
    onSuccess: () => {
      utils.messages.unreadCount.invalidate()
      utils.messages.listConversations.invalidate()
    },
  })

  const deleteConv = api.messages.deleteConversation.useMutation({
    onSuccess: () => {
      setSelectedConv(null)
      utils.messages.listConversations.invalidate()
      utils.messages.suggestions.invalidate()
    },
  })

  const selectedConversation = conversations?.find((c) => c.id === selectedConv)
  const headerOther =
    selectedConversation?.participants.find((p) => p.user.id !== currentUserId)?.user ??
    selectedConversation?.participants[0]?.user
  const isGroup = Boolean(selectedConversation?.name)
  const conversationTitle = selectedConversation?.name ??
    headerOther?.name ??
    headerOther?.email ??
    'Conversation'
  const lastMessageId = messages?.messages.at(-1)?.id
  const selectableUsers = users?.filter((user) => user.id !== currentUserId)

  useEffect(() => {
    if (!selectedConv || !lastMessageId) return
    markConversationRead({ conversationId: selectedConv })
  }, [lastMessageId, markConversationRead, selectedConv])

  const handleSend = () => {
    const content = newMsg.trim()
    if (!content || !selectedConv || sendMsg.isPending) return
    sendMsg.mutate({ conversationId: selectedConv, content })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left — conversation list */}
      <div className="flex w-80 shrink-0 flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Messages</h1>
            <p className="text-sm text-text-tertiary mt-1">Chat with your team</p>
          </div>
          <Button size="sm" onClick={() => setShowNewConv(true)}>
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>

        {error ? (
          <Card className="border-red-500/20 bg-red-500/10">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-sm font-medium text-red-300">Failed to load conversations</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : conversations?.length === 0 && !showNewConv ? (
          <Card className="border-dashed border-border-subtle">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <MessageSquare className="h-8 w-8 text-text-tertiary mb-3" />
              <p className="text-sm text-text-tertiary">No conversations yet</p>
              <p className="text-xs text-text-muted mt-1">Start a conversation with a teammate</p>
              <Button className="mt-4" size="sm" onClick={() => setShowNewConv(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New conversation
              </Button>
            </CardContent>
          </Card>
        ) : showNewConv ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="mb-3 grid grid-cols-2 rounded-lg bg-card p-1">
              {(['direct', 'group'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setNewConversationType(type)
                    setSelectedUserIds([])
                  }}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    newConversationType === type
                      ? 'bg-primary-500 text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {type === 'direct' ? 'Direct message' : 'Group chat'}
                </button>
              ))}
            </div>
            {newConversationType === 'group' && (
              <div className="mb-3">
                <label htmlFor="group-name" className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Group name
                </label>
                <input
                  id="group-name"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  maxLength={80}
                  placeholder="e.g. Product team"
                  className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            )}
            <div className="flex-1 space-y-1 overflow-y-auto">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full rounded-lg border border-border-subtle bg-card py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  autoFocus
                />
              </div>
              {selectableUsers?.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    if (newConversationType === 'direct') {
                      createConv.mutate({ participantId: u.id })
                      return
                    }
                    setSelectedUserIds((current) =>
                      current.includes(u.id)
                        ? current.filter((id) => id !== u.id)
                        : [...current, u.id],
                    )
                  }}
                  disabled={createConv.isPending || createGroup.isPending}
                  className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                    selectedUserIds.includes(u.id)
                      ? 'bg-primary-500/10 ring-1 ring-inset ring-primary-500/30'
                      : 'hover:bg-card/[0.04]'
                  }`}
                >
                  <div className="shrink-0">
                    <Avatar user={u} size={32} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">{u.name ?? 'Unknown'}</p>
                    <p className="text-xs text-text-tertiary">{u.email}</p>
                  </div>
                  {newConversationType === 'group' && (
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      selectedUserIds.includes(u.id)
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-border-subtle text-transparent'
                    }`}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              ))}
              {selectableUsers?.length === 0 && (
                <p className="py-4 text-center text-sm text-text-tertiary">No users found</p>
              )}
            </div>
            {newConversationType === 'group' && (
              <Button
                size="sm"
                className="mt-2 w-full shrink-0"
                disabled={!groupName.trim() || selectedUserIds.length < 2 || createGroup.isPending}
                onClick={() => createGroup.mutate({
                  name: groupName.trim(),
                  participantIds: selectedUserIds,
                })}
              >
                {createGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Create group ({selectedUserIds.length})
              </Button>
            )}
            <Button variant="ghost" size="sm" className="w-full text-text-tertiary shrink-0 mt-2" onClick={() => setShowNewConv(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex-1 space-y-1 overflow-y-auto">
            {conversations?.map((conv) => {
              const group = Boolean(conv.name)
              const other =
                conv.participants.find((p) => p.user.id !== currentUserId)?.user ??
                conv.participants[0]?.user
              const lastMsg = conv.messages[0]
              const mine = lastMsg && lastMsg.sender.id === currentUserId
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv.id)}
                  className={`w-full rounded-xl p-3 text-left transition-all duration-150 ${
                    selectedConv === conv.id
                      ? 'bg-primary-500/10 ring-1 ring-primary-500/30'
                      : 'hover:bg-card/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {group ? (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500/15 text-primary-400">
                          <Users className="h-4 w-4" />
                        </span>
                      ) : (
                        <Avatar user={other} size={36} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {conv.name ?? other?.name ?? other?.email ?? 'Unknown'}
                      </p>
                      {lastMsg && (
                        <p className="truncate text-xs text-text-tertiary mt-0.5">
                          {mine ? 'You: ' : ''}
                          {lastMsg.content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Right — messages view */}
      <div className="flex flex-1 flex-col rounded-2xl border border-border-subtle bg-card">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border-subtle px-6 py-4">
              <div className="shrink-0">
                {isGroup ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500/15 text-primary-400">
                    <Users className="h-4 w-4" />
                  </span>
                ) : (
                  <Avatar user={headerOther} size={36} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {conversationTitle}
                </p>
                {isGroup ? (
                  <p className="truncate text-[11px] text-text-tertiary">
                    {selectedConversation?.participants.length} members
                  </p>
                ) : headerOther ? (
                  <p className="truncate text-[11px] text-text-tertiary">
                    {formatPresence(headerOther.lastActiveAt).label}
                  </p>
                ) : null}
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Delete this conversation? This removes it and its messages for everyone.')) {
                    deleteConv.mutate({ conversationId: selectedConv })
                  }
                }}
                disabled={deleteConv.isPending}
                title="Delete conversation"
                className="shrink-0 rounded-lg p-2 text-text-tertiary transition-colors hover:bg-neg-bg hover:text-red-600 disabled:opacity-60"
              >
                {deleteConv.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
              {msgsLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className="h-10 w-48 rounded-2xl bg-card animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : messages?.messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-text-tertiary">No messages yet. Send one to start the conversation.</p>
                </div>
              ) : (
                messages?.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${
                        msg.senderId === currentUserId
                          ? 'bg-primary-500 text-white'
                          : 'bg-white/[0.06] text-text-primary'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          msg.senderId === currentUserId
                            ? 'text-primary-200'
                            : 'text-text-tertiary'
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {isGroup && msg.senderId !== currentUserId && (
                        <p className="mt-1 text-[10px] font-medium text-text-secondary">
                          {msg.sender.name ?? 'Member'}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border-subtle px-6 py-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Type a message..."
                  className="block flex-1 rounded-xl border border-border-subtle bg-card px-4 py-2.5 text-sm placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-150"
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMsg.trim() || sendMsg.isPending}
                  className="h-10 w-10 shrink-0 rounded-xl p-0"
                >
                  {sendMsg.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {sendMsg.error && (
                <p className="mt-2 text-xs text-red-400">
                  Message was not sent. Your text has been restored so you can retry.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6">
            {suggestions && suggestions.length > 0 ? (
              <div className="w-full max-w-md">
                <div className="mb-4 text-center">
                  <MessageSquare className="mx-auto mb-2 h-10 w-10 text-text-tertiary" />
                  <p className="text-sm font-semibold text-text-primary">Start a conversation</p>
                  <p className="mt-1 text-xs text-text-muted">Suggested people to message</p>
                </div>
                <div className="space-y-1.5">
                  {suggestions.map((s) => {
                    const presence = formatPresence(s.lastActiveAt)
                    return (
                      <button
                        key={s.id}
                        onClick={() => createConv.mutate({ participantId: s.id })}
                        disabled={createConv.isPending}
                        className="flex w-full items-center gap-3 rounded-xl border border-border-subtle bg-card p-2.5 text-left transition-colors hover:bg-card/[0.06] disabled:opacity-60"
                      >
                        <div className="relative shrink-0">
                          <Avatar user={s} size={36} />
                          {presence.online && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-pos ring-2 ring-card" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">
                            {s.name ?? s.email}
                          </p>
                          <p className="truncate text-[11px] text-text-tertiary">
                            {s.title ? `${s.title} · ` : ''}
                            {presence.label}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-primary-500 px-3 py-1.5 text-[11px] font-semibold text-white">
                          Message
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <MessageSquare className="mx-auto mb-3 h-12 w-12 text-text-tertiary" />
                <p className="text-sm text-text-tertiary">Select a conversation</p>
                <p className="mt-1 text-xs text-text-muted">or start a new one</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
