import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type ToastFn = (message: string) => void
const ToastContext = createContext<ToastFn>(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [shown, setShown] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const toast = useCallback<ToastFn>((m) => {
    setMessage(m)
    setShown(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setShown(false), 3200)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div id="toast" className={shown ? 'show' : ''} role="status">{message}</div>
    </ToastContext.Provider>
  )
}
