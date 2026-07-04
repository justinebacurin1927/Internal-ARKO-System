import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import {
  MessageSquare, Send, X, Check, Loader2,
} from 'lucide-react'

interface CommentSectionProps {
  resourceType: string
  resourceId: string
  /** If true, renders compact for use inside cards */
  compact?: boolean
}

export default function CommentSection({ resourceType, resourceId, compact }: CommentSectionProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { toast } = useToast()
  const [newComment, setNewComment] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')

  const queryKey = ['comments', resourceType, resourceId]

  const { data: comments, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.getComments(resourceType, resourceId),
    enabled: !!resourceType && !!resourceId,
  })

  const createComment = useMutation({
    mutationFn: () => api.createComment(resourceType, resourceId, newComment.trim()),
    onSuccess: () => {
      setNewComment('')
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const editComment = useMutation({
    mutationFn: () => api.editComment(editingId!, editContent.trim()),
    onSuccess: () => {
      setEditingId(null)
      setEditContent('')
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteComment = useMutation({
    mutationFn: (id: number) => api.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast('Comment deleted')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || createComment.isPending) return
    createComment.mutate()
  }

  const startEdit = (c: any) => {
    setEditingId(c.id)
    setEditContent(c.content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  if (compact) {
    return (
      <div className="space-y-2 pt-2 border-t border-border-subtle">
        {/* Existing comments (show latest 2) */}
        {comments && comments.length > 0 && (
          <div className="space-y-1.5">
            {comments.slice(-2).map((c: any) => (
              <div key={c.id} className="flex gap-2 text-[11px]">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[8px] font-bold text-accent-600">
                  {(c.user_name || c.user_email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-text-primary">{c.user_name || c.user_email}</span>
                  <p className="text-text-secondary">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick add */}
        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11px] bg-white focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/10"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || createComment.isPending}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-600 text-white hover:bg-accent-500 transition-all disabled:opacity-40 cursor-pointer"
          >
            {createComment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </button>
        </form>
      </div>
    )
  }

  /* ── Full layout ── */
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-text-tertiary" />
        <h4 className="text-xs font-semibold text-text-primary">
          Comments {comments ? `(${comments.length})` : ''}
        </h4>
      </div>

      {/* Comments list */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-2 animate-pulse">
                <div className="h-6 w-6 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 rounded bg-gray-100" />
                  <div className="h-4 w-full rounded bg-gray-50" />
                </div>
              </div>
            ))}
          </div>
        ) : comments && comments.length > 0 ? (
          comments.map((c: any) => (
            <div key={c.id} className="flex gap-2 group">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[9px] font-bold text-accent-600">
                {(c.user_name || c.user_email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-text-primary">
                    {c.user_name || c.user_email}
                  </span>
                  <span className="text-[9px] text-text-tertiary">
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {c.edited && <span className="text-[8px] text-text-tertiary">(edited)</span>}
                </div>

                {editingId === c.id ? (
                  <div className="mt-1 space-y-1">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      autoFocus
                      className="w-full rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11px] bg-white focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/10"
                    />
                    <div className="flex gap-1">
                      <button onClick={() => editComment.mutate()} disabled={!editContent.trim()}
                        className="inline-flex items-center gap-1 rounded-md bg-accent-600 px-2 py-1 text-[9px] font-medium text-white hover:bg-accent-500 transition-all disabled:opacity-40 cursor-pointer">
                        <Check className="h-2.5 w-2.5" /> Save
                      </button>
                      <button onClick={cancelEdit}
                        className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[9px] font-medium text-text-secondary hover:text-text-primary transition-all cursor-pointer">
                        <X className="h-2.5 w-2.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-text-secondary mt-0.5">{c.content}</p>
                )}

                {/* Actions */}
                {user && (user.id === c.user) && (
                  <div className="mt-0.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(c)}
                      className="text-[9px] text-text-tertiary hover:text-accent-600 transition-colors cursor-pointer">
                      Edit
                    </button>
                    <button onClick={() => deleteComment.mutate(c.id)}
                      className="text-[9px] text-text-tertiary hover:text-neg transition-colors cursor-pointer">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-text-tertiary text-center py-4">No comments yet</p>
        )}
      </div>

      {/* Add comment */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-600 text-[9px] font-bold text-white">
          {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 flex gap-1.5">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={1}
            className="flex-1 rounded-lg border border-border-subtle px-3 py-1.5 text-xs bg-white placeholder:text-text-tertiary focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-500/10 resize-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || createComment.isPending}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white hover:bg-accent-500 transition-all disabled:opacity-40 cursor-pointer shrink-0"
          >
            {createComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </form>
    </div>
  )
}
