import { useState, useRef, useCallback } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'

interface FilePickerProps {
  objectType: 'task' | 'note' | 'message'
  objectId?: number | string
  onUploaded?: (file: any) => void
}

const ACCEPTED = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.docx,.xlsx,.txt,.csv'
const MAX_SIZE = 10 * 1024 * 1024

export default function FilePicker({ objectType, objectId, onUploaded }: FilePickerProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFile = useCallback(async (file: File) => {
    if (!objectId) {
      toast('Save the item first, then attach files', 'info')
      return
    }

    if (file.size > MAX_SIZE) {
      toast('File too large. Max 10MB', 'error')
      return
    }

    setUploading(true)
    try {
      const result = await api.uploadFile(file, objectType, objectId)
      toast('File uploaded')
      onUploaded?.(result)
    } catch (err: any) {
      toast(err?.message || 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }, [objectType, objectId, onUploaded, toast])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-2.5 text-xs transition-colors ${
        dragging
          ? 'border-accent-500 bg-accent-50 text-accent-600'
          : 'border-border-subtle text-text-tertiary hover:border-accent-300 hover:text-accent-500'
      }`}
    >
      {uploading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading…</span>
        </>
      ) : (
        <>
          <Upload className="h-4 w-4" />
          <span>Drop file or click to upload</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
