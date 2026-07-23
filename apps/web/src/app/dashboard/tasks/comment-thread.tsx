'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { Button } from '@arko/ui'
import { Loader2, Pencil, Trash2, X, Check } from 'lucide-react'

const OpenPeepsAvatar = dynamic(() =>
  import('../../../components/open-peeps-avatar').then((m) => ({ default: m.OpenPeepsAvatar })),
  { ssr: false },
)
import { api } from '../../../lib/trpc/client'

function relTime(d: string | Date): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function CommentThread({
  resourceType,
  resourceId,
  onError,
}: {
  resourceType: string
  resourceId: string
  onError: (msg: string) => void
}) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const utils = api.useUtils()

  const { data: comments, isLoading } = api.comments.list.useQuery({ resourceType, resourceId })

  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const invalidate = () => utils.comments.list.invalidate({ resourceType, resourceId })

  const createC = api.comments.create.useMutation({
    onError: (e) => onError(e.message),
    onSuccess: () => {
      setContent('')
      invalidate()
    },
  })
  const updateC = api.comments.update.useMutation({
    onError: (e) => onError(e.message),
    onSuccess: () => {
      setEditingId(null)
      invalidate()
    },
  })
  const deleteC = api.comments.delete.useMutation({
    onError: (e) => onError(e.message),
    onSuccess: () => {
      setConfirmDeleteId(null)
      invalidate()
    },
  })

  return (
    <div className="border-t border-border-subtle pt-4">
      <h3 className="mb-2 text-sm font-semibold text-text-secondary">
        Comments{comments ? ` (${comments.length})` : ''}
      </h3>

      {isLoading ? (
        <p className="text-xs text-text-tertiary">Loading comments…</p>
      ) : !comments || comments.length === 0 ? (
        <p className="text-xs text-text-tertiary">No comments yet</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c: any) => {
            const mine = c.user?.id === currentUserId
            return (
              <div key={c.id} className="flex gap-2">
                <OpenPeepsAvatar
                  userId={c.user?.id}
                  avatarJson={c.user?.avatar ? JSON.stringify(c.user.avatar) : undefined}
                  size={24}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-text-primary">{c.user?.name ?? 'Unknown'}</span>
                    <span className="text-[10px] text-text-tertiary">{relTime(c.createdAt)}</span>
                    {c.edited && <span className="text-[10px] text-text-tertiary">(edited)</span>}
                  </div>

                  {editingId === c.id ? (
                    <div className="mt-1 flex items-start gap-1">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (editText.trim()) updateC.mutate({ id: c.id, content: editText.trim() })
                          }
                        }}
                        rows={2}
                        maxLength={2000}
                        className="flex-1 resize-none rounded-md border border-border-subtle px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => editText.trim() && updateC.mutate({ id: c.id, content: editText.trim() })}
                        disabled={!editText.trim()}
                        className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-40"
                        aria-label="Save"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded p-1 text-text-tertiary hover:bg-card/[0.04]"
                        aria-label="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary whitespace-pre-wrap">{c.content}</p>
                  )}

                  {mine && editingId !== c.id && (
                    <div className="mt-1 flex items-center gap-2">
                      {confirmDeleteId === c.id ? (
                        <>
                          <span className="text-[10px] text-text-tertiary">Delete?</span>
                          <button
                            onClick={() => deleteC.mutate({ id: c.id })}
                            className="text-[10px] font-medium text-red-600 hover:text-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] text-text-tertiary hover:text-text-secondary"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(c.id)
                              setEditText(c.content)
                            }}
                            className="inline-flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-secondary"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(c.id)}
                            className="inline-flex items-center gap-1 text-[10px] text-text-tertiary hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-3 flex items-start gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (content.trim()) createC.mutate({ resourceType, resourceId, content: content.trim() })
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder="Write a comment… (Enter to post, Shift+Enter for newline)"
          className="flex-1 resize-none rounded-md border border-border-subtle px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
        />
        <Button
          onClick={() => content.trim() && createC.mutate({ resourceType, resourceId, content: content.trim() })}
          disabled={createC.isPending || !content.trim()}
        >
          {createC.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
        </Button>
      </div>
    </div>
  )
}
