import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      {/* Dialog */}
      <div className="relative w-full max-w-sm rounded-2xl border border-border-subtle bg-white p-6 shadow-xl animate-[fade-in_0.15s_ease-out]">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neg-bg">
            <AlertTriangle className="h-5 w-5 text-neg" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <p className="mt-1 text-sm text-text-secondary">{message}</p>
          </div>
          <button onClick={onCancel} className="p-0.5 text-text-tertiary hover:text-text-primary cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-app transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-neg px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
