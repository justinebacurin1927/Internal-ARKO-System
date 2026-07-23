'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Loader2, Check } from 'lucide-react'
import { api } from '../lib/trpc/client'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

interface FileUploaderProps {
  resourceType: string
  resourceId: string
  onUploadComplete?: () => void
  /** Override the max file size in bytes (default 50MB) */
  maxSize?: number
}

type UploadState = 'idle' | 'uploading' | 'error' | 'done'

export function FileUploader({
  resourceType,
  resourceId,
  onUploadComplete,
  maxSize = MAX_FILE_SIZE,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const createUploadUrl = api.storage.createUploadUrl.useMutation()
  const confirmUpload = api.storage.confirm.useMutation()

  const uploadFile = useCallback(
    async (file: File) => {
      // Client-side validation
      if (file.size > maxSize) {
        setErrorMsg(`File is too large. Maximum size is ${maxSize / 1024 / 1024} MB.`)
        setUploadState('error')
        return
      }

      setFileName(file.name)
      setErrorMsg('')
      setProgress(0)
      setUploadState('uploading')

      try {
        // 1. Get presigned URL
        const { uploadUrl, fileKey } = await createUploadUrl.mutateAsync({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          resourceType,
          resourceId: resourceId || undefined,
        })

        // 2. Upload with XHR for progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100))
            }
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`Upload failed with status ${xhr.status}`))
          }

          xhr.onerror = () => reject(new Error('Network error during upload'))
          xhr.send(file)
        })

        // 3. Confirm
        await confirmUpload.mutateAsync({
          fileKey,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          resourceType,
          resourceId: resourceId || undefined,
        })

        setUploadState('done')
        onUploadComplete?.()

        // Reset after 2s
        setTimeout(() => {
          setUploadState('idle')
          setProgress(0)
          setFileName('')
        }, 2000)
      } catch (err: any) {
        setErrorMsg(err?.message ?? 'Upload failed')
        setUploadState('error')
      }
    },
    [resourceType, resourceId, maxSize, createUploadUrl, confirmUpload, onUploadComplete],
  )

  const handleFile = (file: File | undefined) => {
    if (!file) return
    uploadFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const active = uploadState === 'uploading'

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      {uploadState === 'idle' || uploadState === 'error' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragOver
              ? 'border-accent-400 bg-accent-50/50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
          }`}
        >
          <Upload className="mb-2 h-6 w-6 text-gray-300" />
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Click to upload</span> or drag and drop a file
          </p>
          <p className="mt-0.5 text-[10px] text-gray-400">
            Up to {maxSize / 1024 / 1024} MB
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      ) : null}

      {/* Progress bar */}
      {active && (
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="mb-1.5 flex items-center gap-2 text-xs text-gray-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="truncate flex-1">{fileName}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-accent-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Done indicator */}
      {uploadState === 'done' && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          <Check className="h-3.5 w-3.5" />
          Uploaded {fileName}
        </div>
      )}

      {/* Error */}
      {uploadState === 'error' && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <X className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button
            autoFocus
            onClick={() => setUploadState('idle')}
            className="font-medium text-red-600 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
