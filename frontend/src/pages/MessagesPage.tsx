import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import { Button } from '../components/Button'
import { Send, Search, Plus, Loader2, AlertCircle, MessageSquare } from 'lucide-react'

export default function MessagesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedConv, setSelectedConv] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewConv, setShowNewConv] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
  })

  const { data: messagesData, isLoading: msgsLoading } = useQuery({
    queryKey: ['messages', selectedConv],
    queryFn: () => api.getMessages(selectedConv!),
    enabled: !!selectedConv,
  })

  const { data: searchResults } = useQuery({
    queryKey: ['users', 'search', searchQuery],
    queryFn: () => api.searchUsers(searchQuery),
    enabled: showNewConv && searchQuery.length > 0,
  })

  const sendMsg = useMutation({
    mutationFn: (content: string) => api.sendMessage(selectedConv!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setMessage('')
    },
  })

  const createConv = useMutation({
    mutationFn: (participantId: string) => api.createConversation(participantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setSelectedConv(data.id)
      setShowNewConv(false)
      setSearchQuery('')
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesData?.messages])

  const otherParticipant = (conv: any) =>
    conv.participants?.find((p: any) => p.id !== user?.id)

  const selectedConvData = conversations?.find((c: any) => c.id === selectedConv)
  const otherUser = selectedConvData ? otherParticipant(selectedConvData) : null

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4" />
        Failed to load conversations
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Messages</h1>
          <p className="text-sm text-gray-500 mt-1">Chat with your team</p>
        </div>
        <Button onClick={() => setShowNewConv(true)}>
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {/* New conversation search */}
      {showNewConv && (
        <Card className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                autoFocus
                className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            {searchResults && searchResults.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-auto">
                {searchResults.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => createConv.mutate(u.id)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                      {u.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{u.name || u.email}</p>
                      {u.name && <p className="text-xs text-gray-500">{u.email}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && searchResults?.length === 0 && (
              <p className="text-sm text-gray-400 py-2 text-center">No users found</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chat area */}
      <Card className="h-[calc(100vh-16rem)] overflow-hidden flex flex-row">
        {/* Conversations list */}
        <div className="w-72 shrink-0 border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
              </div>
            ) : conversations?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <MessageSquare className="h-8 w-8 text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">No conversations yet</p>
              </div>
            ) : (
              conversations?.map((conv: any) => {
                const other = otherParticipant(conv)
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv.id)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      selectedConv === conv.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                        {other?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{other?.name || other?.email || 'Unknown'}</p>
                        {conv.messages?.[0]?.content && (
                          <p className="text-xs text-gray-500 truncate">{conv.messages[0].content}</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <Send className="h-5 w-5 text-gray-300" />
                </div>
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              {otherUser && (
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                    {otherUser?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{otherUser?.name || otherUser?.email}</p>
                    {otherUser?.name && <p className="text-xs text-gray-500">{otherUser.email}</p>}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                  </div>
                ) : messagesData?.messages?.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No messages yet. Send one!</p>
                ) : (
                  messagesData?.messages?.map((msg: any) => {
                    const isMe = msg.sender === user?.id
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMe
                              ? 'bg-primary-500 text-white rounded-br-md'
                              : 'bg-gray-100 text-gray-900 rounded-bl-md'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-gray-100 shrink-0">
                <form
                  onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMsg.mutate(message.trim()) }}
                  className="flex gap-3"
                >
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <Button
                    type="submit"
                    disabled={!message.trim() || sendMsg.isPending}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
