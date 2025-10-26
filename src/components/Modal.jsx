"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  position = 'center',
  topOffset = 80,
}) {
  const [rootEl, setRootEl] = useState(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    setRootEl(root);
  }, []);

  // Lock scroll
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !rootEl) return null;

  const isTopRight = position === 'top-right';

  const modalStyle = {
    top: isTopRight ? topOffset : '50%',
    right: isTopRight ? 12 : 'auto',
    left: isTopRight ? 'auto' : '50%',
    transform: isTopRight ? 'none' : 'translate(-50%, -50%)',
    width: isTopRight ? 380 : 'calc(100% - 32px)',
    maxWidth: isTopRight ? 420 : 520,
    height: isTopRight ? 'auto' : '88vh',
    maxHeight: isTopRight ? '80vh' : undefined,
  };

  const bodyStyle = {
    height: isTopRight ? 'auto' : 'calc(88vh - 56px)',
  };

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        paddingTop: 24,
        paddingBottom: 24,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'start',
      }}
    >
      <div
        className="modal-container"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close"
          >
            <svg
              className="modal-close-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="modal-close-ripple"></span>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={bodyStyle}>
          {children}
        </div>

        {/* Optional Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    rootEl
  );
}