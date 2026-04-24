import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)
const AUTO_DISMISS_MS = 5000

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback((toast) => {
    setToasts((prev) => [...prev, toast])
    if (toast.autoDismiss !== false) {
      setTimeout(() => removeToast(toast.id), toast.duration ?? AUTO_DISMISS_MS)
    }
  }, [removeToast])

  const showToast = useCallback((message, { type = 'info', duration, autoDismiss = true } = {}) => {
    if (!message) return
    const id = generateId()
    pushToast({ id, message, type, duration, autoDismiss })
  }, [pushToast])

  const showSuccess = useCallback((message) => showToast(message, { type: 'success' }), [showToast])
  const showError = useCallback((message) => showToast(message, { type: 'error', autoDismiss: false }), [showToast])
  const showWarning = useCallback((message) => showToast(message, { type: 'warning' }), [showToast])

  const value = useMemo(() => ({
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    removeToast
  }), [toasts, showToast, showSuccess, showError, showWarning, removeToast])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}

export default ToastContext
