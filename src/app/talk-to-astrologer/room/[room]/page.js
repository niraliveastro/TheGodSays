'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { ArrowLeft, PhoneOff, Video } from 'lucide-react'

export default function VideoCallRoom() {
  const params = useParams()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [wsUrl, setWsUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [callDuration, setCallDuration] = useState(0)

  useEffect(() => {
    const initializeRoom = async () => {
      try {
        const roomName = params.room
        const userRole = localStorage.getItem('tgs:role') || 'user'
        const userId = localStorage.getItem('tgs:userId')
        const astrologerId = localStorage.getItem('tgs:astrologerId')
        const isAstrologer = userRole === 'astrologer'

        if (!userId) throw new Error('User not authenticated')

        const participantId = isAstrologer ? `astrologer-${userId}` : `user-${userId}`
        const sessionAstrologerId = isAstrologer ? userId : (astrologerId || 'user-session')

        const response = await fetch('/api/livekit/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            astrologerId: sessionAstrologerId,
            userId: isAstrologer ? astrologerId : userId,
            roomName,
            callType: 'video',
            role: isAstrologer ? 'astrologer' : 'user',
            displayName: isAstrologer ? 'Astrologer' : 'User'
          })
        })

        if (!response.ok) throw new Error('Failed to create session')

        const data = await response.json()
        setToken(data.token)
        setWsUrl(data.wsUrl)
      } catch (err) {
        setError(`Failed to join video call: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (params.room) initializeRoom()
  }, [params.room])

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration(p => p + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleDisconnect = async () => {
    try {
      // Get call details from localStorage or URL
      const callId = localStorage.getItem('tgs:currentCallId') || localStorage.getItem('tgs:callId') || params.room
      const durationMinutes = Math.max(1, Math.ceil(callDuration / 60)) // Convert seconds to minutes, minimum 1 minute
      
      // Clear stored call ID after use
      localStorage.removeItem('tgs:currentCallId')
      localStorage.removeItem('tgs:callId')
      
      console.log(`Ending call ${callId} with duration ${durationMinutes} minutes`)
      
      // Finalize billing before disconnecting
      if (callId && durationMinutes > 0) {
        // Try direct billing API first
        const billingResponse = await fetch('/api/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'immediate-settlement',
            callId: callId,
            durationMinutes: durationMinutes
          })
        })
        
        const billingResult = await billingResponse.json()
        
        if (billingResult.success) {
          console.log(`✅ Billing finalized: ₹${billingResult.finalAmount} charged, ₹${billingResult.refundAmount} refunded`)
          
          // Update call status
          await fetch('/api/calls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update-call-status',
              callId: callId,
              status: 'completed',
              durationMinutes: durationMinutes
            })
          })
        } else {
          console.error('❌ Billing finalization failed:', billingResult.error)
          // Still update call status even if billing fails
          await fetch('/api/calls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update-call-status',
              callId: callId,
              status: 'completed'
            })
          })
        }
      }
    } catch (error) {
      console.error('Error finalizing call:', error)
    } finally {
      // Navigate away regardless of billing result
      const role = localStorage.getItem('tgs:role')
      const path = role === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer'
      router.push(path)
    }
  }

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-cream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '3rem',
            height: '3rem',
            borderTopColor: '#fbbf24',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: 'white', fontSize: '1.125rem', margin: 0 }}>
            Connecting to video call...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}>
        <div className="card" style={{
          maxWidth: '28rem',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ 
            color: 'white', 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-heading)'
          }}>
            Connection Failed
          </h2>
          <p style={{ 
            color: '#d1d5db', 
            marginBottom: '1.5rem',
            lineHeight: 1.6 
          }}>{error}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Retry Connection
            </button>
            <button
              onClick={() => {
                const role = localStorage.getItem('tgs:role')
                router.push(role === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer')
              }}
              className="btn btn-ghost"
              style={{ 
                width: '100%',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)'
              }}
            >
              <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!token || !wsUrl) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a8a, #6b21a8, #4c1d95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ 
            color: 'white', 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-heading)'
          }}>
            Setting up Video Call
          </h2>
          <p style={{ color: '#d1d5db', margin: '0 0 1rem 0' }}>
            Please wait while we connect you...
          </p>
          <div className="spinner" style={{
            width: '2rem',
            height: '2rem',
            borderTopColor: '#fbbf24',
            margin: '0 auto'
          }}></div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a, #6b21a8, #4c1d95)',
      position: 'relative'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        padding: 'var(--space-md) var(--space-lg)'
      }}>
        <div className="container" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <button
              onClick={() => {
                const role = localStorage.getItem('tgs:role')
                router.push(role === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer')
              }}
              className="btn btn-ghost"
              style={{ 
                color: '#d1d5db',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
              Back
            </button>
            <div>
              <h1 style={{ 
                color: 'white', 
                fontWeight: 600, 
                fontSize: '1.25rem',
                margin: 0,
                fontFamily: 'var(--font-heading)'
              }}>
                Video Consultation
              </h1>
              <p style={{ 
                color: '#d1d5db', 
                fontSize: '0.875rem',
                margin: '0.25rem 0 0 0'
              }}>
                Duration: {formatDuration(callDuration)}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <div style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                background: '#3b82f6',
                boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
                animation: 'pulse 2s infinite'
              }}></div>
              <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600 }}>
                LIVE
              </span>
            </div>
            <button
              onClick={handleDisconnect}
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                color: 'white',
                border: 'none',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
              }}
            >
              <PhoneOff style={{ width: '1rem', height: '1rem' }} />
              End Call
            </button>
          </div>
        </div>
      </header>

      {/* Video Conference */}
      <div style={{
        height: 'calc(100vh - 80px)',
        padding: 'var(--space-lg)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '80rem',
          height: '100%',
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <LiveKitRoom
            serverUrl={wsUrl}
            token={token}
            onDisconnected={handleDisconnect}
            onError={(err) => setError(`Video call error: ${err.message}`)}
            onConnected={() => setError('')}
            style={{ height: '100%', width: '100%' }}
          >
            <VideoConference />
          </LiveKitRoom>

          {/* Bottom Control Bar - Inside video container */}
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            pointerEvents: 'auto'
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '0.875rem 1.75rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
              minWidth: '280px',
              justifyContent: 'center'
            }}>
              <Video style={{ width: '1.125rem', height: '1.125rem', color: '#3b82f6', flexShrink: 0 }} />
              <div style={{
                width: '1px',
                height: '1.5rem',
                background: 'rgba(255,255,255,0.3)',
                flexShrink: 0
              }}></div>
              <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Video Call • {formatDuration(callDuration)}
              </span>
              <div style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 10px rgba(34, 197, 94, 0.8)',
                animation: 'pulse 2s infinite',
                flexShrink: 0
              }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile responsive adjustments */}
      <style jsx>{`
        @media (max-width: 768px) {
          header > div {
            flex-direction: column;
            align-items: flex-start !important;
          }
          header > div > div:last-child {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  )
}