import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'
import MentionInput from './MentionInput'
import ConfirmDialog from './ConfirmDialog'
import { Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'

interface Comment {
  id: number
  author: number
  author_name: string
  author_image: string | null
  content: string
  edited: boolean
  created_at: string
  is_owner: boolean
  can_edit: boolean
}

interface CommentThreadProps {
  taskId: string
  onCommentAdded?: () => void
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function CommentThread({ taskId, onCommentAdded }: CommentThreadProps) {
  const [newComment, setNewComment] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => api.getComments(taskId),
    enabled: !!taskId,
  })
  const comments: Comment[] = commentsData?.results || []

  const createMutation = useMutation({
    mutationFn: () => api.createComment(taskId, newComment.trim()),
    onSuccess: () => {
      setNewComment('')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] })
      toast('Comment posted')
      onCommentAdded?.()
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => api.editComment(id, content),
    onSuccess: () => {
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast('Comment updated')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast('Comment deleted')
    },
  })

  return (
    <div className="space-y-2">
      {commentsLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
        </div>
      ) : comments.length === 0 && (
        <p className="py-3 text-center text-xs text-text-tertiary">No comments yet</p>
      )}

      {comments.map((c) => (
        <div key={c.id} className="rounded-lg border border-border-subtle bg-white/60 px-2.5 py-2">
          {editingId === c.id ? (
            <div className="space-y-1.5">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-white px-2 py-1.5 text-xs outline-none focus:border-accent-500"
                rows={2}
                autoFocus
              />
              <div className="flex gap-1.5 justify-end">
                <button
                  onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
                <button
                  onClick={() => editMutation.mutate({ id: c.id, content: editContent })}
                  disabled={!editContent.trim()}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-accent-500 hover:bg-accent-50 disabled:text-text-tertiary transition-colors cursor-pointer"
                >
                  <Check className="h-3 w-3" /> Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                {c.author_image ? (
                  <img src={c.author_image} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[8px] font-bold text-white">
                    {c.author_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="text-xs font-medium text-text-primary">{c.author_name}</span>
                <span className="text-[10px] text-text-tertiary">{timeAgo(c.created_at)}</span>
                {c.edited && <span className="text-[10px] text-text-tertiary italic">(edited)</span>}
              </div>
              <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{c.content}</p>
              {c.is_owner && (
                <div className="mt-1 flex gap-1.5 justify-end">
                  {c.can_edit && (
                    <button
                      onClick={() => { setEditingId(c.id); setEditContent(c.content) }}
                      className="rounded p-0.5 text-text-tertiary hover:text-accent-500 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="rounded p-0.5 text-text-tertiary hover:text-neg transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {/* New comment input */}
      <div className="pt-1 border-t border-border-subtle">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newComment.trim()) createMutation.mutate()
          }}
        >
          <MentionInput
            value={newComment}
            onChange={setNewComment}
            placeholder="Write a comment… (Cmd+Enter to post)"
            minRows={2}
            onSubmit={() => {
              if (newComment.trim()) createMutation.mutate()
            }}
          />
          <div className="flex justify-end mt-1">
            <button
              type="submit"
              disabled={!newComment.trim() || createMutation.isPending}
              className="rounded-lg bg-accent-500 px-3 py-1 text-xs font-medium text-white hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {createMutation.isPending ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete comment?"
        message="Are you sure you want to delete this comment?"
        onConfirm={() => {
          if (deleteId !== null) deleteMutation.mutate(deleteId)
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
