import { useState, useEffect } from 'react'
import { Phone, PhoneOff, X, Volume2 } from 'lucide-react'

export default function VoiceCallNotification({ call, onAccept, onReject, onClose }) {
  const [timeLeft, setTimeLeft] = useState(30)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoReject()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleAutoReject = () => {
    setIsVisible(false)
    onReject(call.id)
    setTimeout(() => {
      onClose(call.id)
    }, 300)
  }

  const handleAccept = () => {
    setIsVisible(false)
    onAccept(call.id)
    setTimeout(() => {
      onClose(call.id)
    }, 300)
  }

  const handleReject = () => {
    setIsVisible(false)
    onReject(call.id)
    setTimeout(() => {
      onClose(call.id)
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div className="modal-backdrop" onClick={handleReject}>
      <div 
        className="modal-container fade-in" 
        onClick={(e) => e.stopPropagation()}
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '28rem',
          width: '90%',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <Volume2 style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
            </div>
            <div>
              <h3 className="modal-title" style={{ marginBottom: '0.25rem' }}>Voice Call</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', margin: 0 }}>
                From User {call.userId?.slice(-4) || 'Unknown'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleReject}>
            <X className="modal-close-icon" />
            <div className="modal-close-ripple"></div>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Call Type Indicator */}
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #6ee7b7',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065f46', marginBottom: '0.25rem' }}>
              <Phone style={{ width: '1rem', height: '1rem' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Voice Consultation</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#047857', margin: 0 }}>
              Audio call without video
            </p>
          </div>

          {/* Timer */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>Auto-reject in:</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#dc2626' }}>{timeLeft}s</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${(timeLeft / 30) * 100}%`,
                  background: '#dc2626'
                }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <button
              onClick={handleReject}
              className="btn"
              style={{
                flex: 1,
                background: 'white',
                color: '#dc2626',
                border: '2px solid #fca5a5',
                padding: '0.875rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: 600
              }}
            >
              <PhoneOff style={{ width: '1.125rem', height: '1.125rem' }} />
              Reject
            </button>
            <button
              onClick={handleAccept}
              className="btn btn-primary"
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                padding: '0.875rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Phone style={{ width: '1.125rem', height: '1.125rem' }} />
              Accept
            </button>
          </div>

          {/* Call Info */}
          <div style={{
            paddingTop: '1rem',
            borderTop: '1px solid var(--color-gray-200)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', margin: 0 }}>
              Voice call started at {new Date(call.createdAt?.seconds ? call.createdAt.seconds * 1000 : call.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}