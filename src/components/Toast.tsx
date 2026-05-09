import { useEffect, useState } from 'react'
import { registerToastListener } from '../utils/toast'

interface ToastItem {
  id: number
  message: string
  type: 'info' | 'error' | 'success'
}

let idCounter = 0

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    registerToastListener((message, type = 'info') => {
      const id = ++idCounter
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 2500)
    })
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium shadow-lg text-white max-w-sm text-center
            ${t.type === 'error' ? 'bg-red-500' : t.type === 'success' ? 'bg-green-500' : 'bg-slate-700'}
          `}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
