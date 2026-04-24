import clsx from 'clsx'
import { useToast } from '../contexts/ToastContext'

const TYPE_STYLES = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800'
}

const ToastContainer = () => {
  const { toasts, removeToast } = useToast()

  if (!toasts.length) return null

  return (
    <div className="fixed inset-x-0 top-4 z-[9999] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'min-w-[280px] max-w-lg rounded-md border px-4 py-3 text-sm shadow-lg transition-all',
            TYPE_STYLES[toast.type] || TYPE_STYLES.info
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="flex-1 whitespace-pre-line">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
            >
              Fechar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
