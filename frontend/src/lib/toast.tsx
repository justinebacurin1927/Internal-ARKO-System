import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>(null!)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const iconMap: Record<ToastType, ReactNode> = {
    success: <CheckCircle2 className="h-4 w-4 text-pos" />,
    error: <AlertCircle className="h-4 w-4 text-neg" />,
    info: <Info className="h-4 w-4 text-accent-500" />,
  }

  const bgMap: Record<ToastType, string> = {
    success: 'bg-pos-bg border-pos/30',
    error: 'bg-neg-bg border-neg/30',
    info: 'bg-accent-50 border-accent-200',
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-lg animate-[slide-up_0.2s_ease-out] ${bgMap[t.type]}`}
          >
            {iconMap[t.type]}
            <span className="text-sm font-medium text-text-primary">{t.message}</span>
            <button onClick={() => remove(t.id)} className="ml-2 p-0.5 text-text-tertiary hover:text-text-primary cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
