import { useState, useEffect } from 'react'
import { FileIcon, Trash2, Loader2, Download } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'
import ConfirmDialog from './ConfirmDialog'

interface FileListProps {
  objectType: 'task' | 'note' | 'message'
  objectId?: number | string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileList({ objectType, objectId }: FileListProps) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!objectId) return
    setLoading(true)
    api.getFiles(objectType, objectId)
      .then(setFiles)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [objectType, objectId])

  const handleDelete = async () => {
    if (deleteId === null) return
    setDeleting(true)
    try {
      await api.deleteFile(deleteId)
      setFiles((prev) => prev.filter((f) => f.id !== deleteId))
      toast('File deleted')
    } catch {
      toast('Failed to delete file', 'error')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  if (!objectId) return null

  const isImage = (ct: string) => ct?.startsWith('image/')
  const isDoc = (ct: string) =>
    ct?.includes('pdf') || ct?.includes('document') || ct?.includes('spreadsheet')

  return (
    <div className="space-y-1">
      {loading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-text-tertiary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading files…
        </div>
      ) : files.length === 0 ? (
        <p className="text-xs text-text-tertiary py-1">No files attached</p>
      ) : (
        files.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent-50/40"
          >
            {isImage(f.content_type) ? (
              <img
                src={f.url}
                alt={f.filename}
                className="h-8 w-8 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-accent-50 text-accent-500">
                {isDoc(f.content_type) ? <FileIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-text-primary">{f.filename}</p>
              <p className="text-[10px] text-text-tertiary">{formatSize(f.size)}</p>
            </div>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-1 text-text-tertiary hover:text-accent-500 transition-colors cursor-pointer"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => setDeleteId(f.id)}
              className="rounded p-1 text-text-tertiary hover:text-neg transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete file?"
        message="Are you sure you want to delete this file? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  )
}
