'use client'

import { useState } from 'react'
import {
  File,
  FileText,
  Image,
  Download,
  Trash2,
  Loader2,
} from 'lucide-react'
import { api } from '../lib/trpc/client'

// Map common MIME types to icons
function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType === 'application/pdf') return FileText
  return File
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface AttachmentListProps {
  resourceType: string
  resourceId: string
}

export function AttachmentList({ resourceType, resourceId }: AttachmentListProps) {
  const { data: files, isLoading, refetch } = api.storage.listFor.useQuery(
    { resourceType, resourceId },
    { enabled: !!resourceId },
  )
  const utils = api.useUtils()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<Set<string>>(new Set())

  const deleteFile = api.storage.delete.useMutation({
    onSuccess: () => {
      setConfirmDeleteId(null)
      refetch()
    },
  })

  // Download: fetch the signed URL then open it
  const downloadFile = async (id: string) => {
    setDownloading((prev) => new Set(prev).add(id))
    try {
      const { url } = await utils.storage.getDownloadUrl.fetch({ id })
      window.open(url, '_blank')
    } catch {
      // Silently fail — the console will show the error
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const numFiles = files?.length ?? 0

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Attachments{numFiles > 0 ? ` (${numFiles})` : ''}
      </h4>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading attachments…
        </div>
      ) : !files || files.length === 0 ? (
        <p className="text-xs text-gray-400">No attachments</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((f: any) => {
            const Icon = fileIcon(f.mimeType)
            const isImage = f.mimeType.startsWith('image/')
            const deleting = confirmDeleteId === f.id
            const dlInProgress = downloading.has(f.id)

            return (
              <div
                key={f.id}
                className="flex items-center gap-2.5 rounded-md bg-gray-50 px-2.5 py-2 text-xs"
              >
                {/* Thumbnail or icon */}
                {isImage ? (
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded border border-gray-200 bg-card">
                    <Icon className="h-full w-full p-1 text-gray-400" />
                  </div>
                ) : (
                  <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                )}

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-700">{f.fileName}</p>
                  <p className="text-[10px] text-gray-400">
                    {formatSize(f.fileSize)} &middot; {f.mimeType.split('/').pop()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => downloadFile(f.id)}
                    disabled={dlInProgress}
                    title="Download"
                    className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-40"
                  >
                    {dlInProgress ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {deleting ? (
                    <span className="flex items-center gap-1 text-[10px] text-gray-500">
                      Delete?
                      <button
                        onClick={() => deleteFile.mutate({ id: f.id })}
                        disabled={deleteFile.isPending}
                        className="font-medium text-red-600 hover:text-red-700"
                      >
                        {deleteFile.isPending ? '…' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="font-medium text-gray-500 hover:text-gray-700"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(f.id)}
                      title="Delete"
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
