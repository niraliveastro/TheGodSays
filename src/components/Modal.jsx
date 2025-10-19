"use client"
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children, footer, position = 'center', topOffset = 80 }) {
  // Ensure a stable portal root element
  const [rootEl, setRootEl] = useState(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    let root = document.getElementById('modal-root')
    if (!root) {
      root = document.createElement('div')
      root.id = 'modal-root'
      document.body.appendChild(root)
    }
    setRootEl(root)
  }, [])

  // Lock page scroll only while modal is open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  try { console.log('[Modal.jsx] portal render', { open, title }) } catch {}

  const isTopRight = position === 'top-right'

  const modalContent = (
    <div
      className="fixed inset-0 flex justify-center items-start overflow-hidden"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 24, paddingBottom: 24, zIndex: 2147483647, pointerEvents: 'auto' }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', zIndex: 0 }}
        onClick={onClose}
      />
      <div
        className="nav-glass rounded-xl shadow-xl border border-gray-200 flex flex-col overflow-hidden"
        style={{
          position: 'fixed',
          top: isTopRight ? topOffset : '50%',
          right: isTopRight ? 12 : 'auto',
          left: isTopRight ? 'auto' : '50%',
          transform: isTopRight ? 'none' : 'translate(-50%, -50%)',
          width: isTopRight ? 380 : 'calc(100% - 32px)',
          maxWidth: isTopRight ? 420 : 520,
          height: isTopRight ? 'auto' : '88vh',
          maxHeight: isTopRight ? '80vh' : undefined,
          zIndex: 1,
          outline: '1px solid rgba(59,130,246,0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b shrink-0" style={{ height: 56, padding: '0 20px' }}>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
        <div
          className="p-6"
          style={{
            height: isTopRight ? 'auto' : 'calc(88vh - 56px)',
            overflowY: 'auto',
            scrollbarGutter: 'stable',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {children}
        </div>
        {footer ? <div className="p-4 border-t bg-gray-50 text-right shrink-0">{footer}</div> : null}
      </div>
    </div>
  )
  if (!open || !rootEl) return null
  return createPortal(modalContent, rootEl)
}

