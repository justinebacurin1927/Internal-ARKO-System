import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'
import {
  Upload, Paperclip, FileText, Image, Video,
  Music, File, Loader2, Download, Trash2,
} from 'lucide-react'

/* ─── Helpers ─── */

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-accent-500" />
  if (mimeType.startsWith('video/')) return <Video className="h-4 w-4 text-blue-500" />
  if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4 text-purple-500" />
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
  return <File className="h-4 w-4 text-text-tertiary" />
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

/* ─── Props ─── */

interface FileUploaderProps {
  resourceType: string
  resourceId?: string
  /** If true, renders as a compact inline row of existing files + upload button */
  compact?: boolean
}

/* ─── Component ─── */

export default function FileUploader({ resourceType, resourceId, compact }: FileUploaderProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const queryKey = ['files', resourceType, resourceId ?? '__all__']

  const { data: files, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.listFiles(resourceType, resourceId),
    enabled: !!resourceType,
  })

  const deleteFile = useMutation({
    mutationFn: (id: string) => api.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast('File deleted')
    },
  })

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await api.uploadFile(file, resourceType, resourceId)
      queryClient.invalidateQueries({ queryKey })
      toast('File uploaded')
    } catch (err: any) {
      toast(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [resourceType, resourceId, queryKey, queryClient, toast])

  // Inline preview for images
  const ImagePreview = ({ file }: { file: any }) => {
    const [showPreview, setShowPreview] = useState(false)
    return (
      <>
        <img
          src={file.url}
          alt={file.file_name}
          className="h-full w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setShowPreview(true)}
        />
        {showPreview && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
            onClick={() => setShowPreview(false)}
          >
            <img src={file.url} alt={file.file_name} className="max-h-full max-w-full rounded-lg shadow-2xl" />
          </div>
        )}
      </>
    )
  }

  if (compact) {
    return (
      <div className="space-y-1.5">
        {/* Existing files */}
        {files && files.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {files.map((f: any) => (
              <div key={f.id} className="group relative h-12 w-12 rounded-lg overflow-hidden border border-border-subtle bg-bg-app">
                {IMAGE_TYPES.includes(f.mime_type) ? (
                  <ImagePreview file={f} />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <FileIcon mimeType={f.mime_type} />
                  </div>
                )}
                <button
                  onClick={() => deleteFile.mutate(f.id)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 rounded-lg border border-border-subtle px-2.5 py-1 text-[10px] font-medium text-text-secondary hover:text-accent-600 hover:border-accent-300 transition-all disabled:opacity-50 cursor-pointer"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
            {uploading ? 'Uploading...' : 'Attach file'}
          </button>
        </div>
      </div>
    )
  }

  /* ── Full layout ── */
  return (
    <div className="space-y-2">
      {/* Upload area */}
      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-subtle p-4 text-text-tertiary hover:border-accent-300 hover:text-accent-500 transition-all"
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5" />
            <span className="text-sm font-medium">Drop a file or click to upload</span>
          </>
        )}
      </div>

      {/* File list */}
      {isLoading ? (
        <div className="space-y-1">
          {[1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : files && files.length > 0 ? (
        <div className="space-y-1">
          {files.map((f: any) => (
            <div key={f.id} className="flex items-center gap-2.5 rounded-lg border border-border-subtle px-3 py-2 hover:bg-accent-50/40 transition-colors group">
              <FileIcon mimeType={f.mime_type} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{f.file_name}</p>
                <p className="text-[10px] text-text-tertiary">{formatSize(f.file_size)}</p>
              </div>
              {IMAGE_TYPES.includes(f.mime_type) && (
                <img src={f.url} alt="" className="h-8 w-8 rounded object-cover" />
              )}
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:text-accent-600 hover:bg-accent-50 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => deleteFile.mutate(f.id)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:text-neg hover:bg-neg-bg transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
