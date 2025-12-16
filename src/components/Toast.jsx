'use client'

import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'
import './Toast.css'

export function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  }

  const Icon = icons[type] || CheckCircle

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <Icon className="toast-icon" />
        <span className="toast-message">{message}</span>
        <button onClick={onClose} className="toast-close" aria-label="Close">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          duration={toast.duration}
        />
      ))}
    </div>
  )
}

