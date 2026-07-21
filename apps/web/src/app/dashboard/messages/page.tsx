'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, Button } from '@arko/ui'
import {
  MessageSquare,
  Send,
  User,
  Loader2,
  AlertCircle,
  Search,
  Plus,
} from 'lucide-react'
import { api } from '../../../lib/trpc/client'

export default function MessagesPage() {
  const [selectedConv, setSelectedConv] = useState<string | null>(null)
  const [newMsg, setNewMsg] = useState('')
  const [showNewConv, setShowNewConv] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  const { data: conversations, isLoading, error } = api.messages.listConversations.useQuery()
  const { data: messages, isLoading: msgsLoading } = api.messages.getMessages.useQuery(
    { conversationId: selectedConv!, limit: 50 },
    { enabled: !!selectedConv },
  )
  const { data: users } = api.users.search.useQuery(
    { query: searchQuery || undefined },
    { enabled: showNewConv },
  )

  const sendMsg = api.messages.sendMessage.useMutation({
    onSuccess: () => {
      setNewMsg('')
      // Refetch messages
      utils.messages.getMessages.invalidate({ conversationId: selectedConv! })
      utils.messages.listConversations.invalidate()
    },
  })

  const createConv = api.messages.createConversation.useMutation({
    onSuccess: (conv) => {
      setSelectedConv(conv.id)
      setShowNewConv(false)
      setSelectedUserId(null)
      setSearchQuery('')
    },
  })

  const utils = api.useUtils()

  const selectedConversation = conversations?.find((c) => c.id === selectedConv)

  const handleSend = () => {
    if (!newMsg.trim() || !selectedConv) return
    sendMsg.mutate({ conversationId: selectedConv, content: newMsg.trim() })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left — conversation list */}
      <div className="flex w-80 shrink-0 flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Messages</h1>
            <p className="text-sm text-gray-500 mt-1">Chat with your team</p>
          </div>
          <Button size="sm" onClick={() => setShowNewConv(true)}>
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>

        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm font-medium text-red-800">Failed to load conversations</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : conversations?.length === 0 && !showNewConv ? (
          <Card className="border-dashed border-gray-200">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <MessageSquare className="h-8 w-8 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No conversations yet</p>
              <p className="text-xs text-gray-300 mt-1">Start a conversation with a teammate</p>
              <Button className="mt-4" size="sm" onClick={() => setShowNewConv(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New conversation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 space-y-1 overflow-y-auto">
            {conversations?.map((conv) => {
              const other = conv.participants[0]?.user
              const lastMsg = conv.messages[0]
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv.id)}
                  className={`w-full rounded-xl p-3 text-left transition-all duration-150 ${
                    selectedConv === conv.id
                      ? 'bg-primary-50 ring-1 ring-primary-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {other?.name ?? other?.email ?? 'Unknown'}
                      </p>
                      {lastMsg && (
                        <p className="truncate text-xs text-gray-500 mt-0.5">
                          {lastMsg.sender.name}: {lastMsg.content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* New conversation dialog */}
        {showNewConv && (
          <Card className="mt-2">
            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  autoFocus
                />
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {users?.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUserId(u.id)
                      createConv.mutate({ participantId: u.id })
                    }}
                    disabled={createConv.isPending}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <User className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </button>
                ))}
                {users?.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-400">No users found</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-gray-500"
                onClick={() => setShowNewConv(false)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right — messages view */}
      <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white">
        {selectedConv && selectedConversation ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedConversation.participants
                    .map((p) => p.user.name ?? p.user.email)
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
              {msgsLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className="h-10 w-48 rounded-2xl bg-gray-100 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : messages?.messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-gray-400">No messages yet. Send one to start the conversation.</p>
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
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          msg.senderId === currentUserId
                            ? 'text-primary-200'
                            : 'text-gray-400'
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Type a message..."
                  className="block flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-150"
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
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Select a conversation</p>
              <p className="text-xs text-gray-300 mt-1">or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
