'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LiveKitRoom, AudioConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { ArrowLeft, PhoneOff, Mic, MicOff, Volume2, Loader2 } from 'lucide-react'

export default function VoiceCallRoom() {
  const params = useParams()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [wsUrl, setWsUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  useEffect(() => {
    const initializeRoom = async () => {
      const userRole = localStorage.getItem('tgs:role') || 'user'
      const userId = localStorage.getItem('tgs:userId')
      const astrologerId = localStorage.getItem('tgs:astrologerId')
      const isAstrologer = userRole === 'astrologer'

      try {
        const roomName = params.room
        if (!userId) throw new Error('User not authenticated')

        const participantId = isAstrologer ? `astrologer-${userId}` : `user-${userId}`
        const sessionAstrologerId = isAstrologer ? astrologerId : (astrologerId || 'user-session')

        const response = await fetch('/api/livekit/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            astrologerId: sessionAstrologerId,
            userId: participantId,
            roomName,
            callType: 'voice',
            role: isAstrologer ? 'astrologer' : 'user',
            displayName: isAstrologer ? 'Astrologer' : 'User',
          }),
        })

        if (!response.ok) {
          const err = await response.text()
          let data = { error: 'Unknown error' }
          try {
            data = JSON.parse(err)
          } catch {}
          throw new Error(data.error || 'Session failed')
        }

        const data = await response.json()
        if (!data.token || !data.wsUrl) throw new Error('Invalid session data')

        setToken(data.token)
        setWsUrl(data.wsUrl)
      } catch (err) {
        setError(`Failed to join voice call: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (params.room) initializeRoom()
  }, [params.room])

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration((p) => p + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleDisconnect = () => {
    if (token && wsUrl) {
      const role = localStorage.getItem('tgs:role')
      const path = role === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer'
      router.push(path)
    }
  }

  const handleToggleMute = (e) => {
    e.stopPropagation()
    setIsMuted(!isMuted)
  }

  const handleBack = (e) => {
    e.stopPropagation()
    const role = localStorage.getItem('tgs:role')
    const path = role === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer'
    router.push(path)
  }

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1e3a8a, #6b21a8, #4c1d95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Loader2
            style={{
              width: '3rem',
              height: '3rem',
              color: '#fbbf24',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ color: 'white', fontSize: '1.125rem' }}>
            Connecting to voice call...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1e3a8a, #6b21a8, #4c1d95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: '28rem',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            shadow: 'var(--shadow-lg)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔇</div>
          <h2
            style={{
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-heading)',
            }}
          >
            Connection Failed
          </h2>
          <p
            style={{
              color: '#d1d5db',
              marginBottom: '1.5rem',
              lineHeight: 1.6,
            }}
          >
            {error}
          </p>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Retry Connection
            </button>
            <button
              onClick={handleBack}
              className="btn btn-ghost"
              style={{
                width: '100%',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              <ArrowLeft
                style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}
              />
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!token || !wsUrl) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1e3a8a, #6b21a8, #4c1d95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '4rem',
              marginBottom: '1rem',
            }}
          >
            ⏳
          </div>
          <h2
            style={{
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-heading)',
            }}
          >
            Setting up Voice Call
          </h2>
          <p
            style={{
              color: '#d1d5db',
              marginBottom: '1rem',
            }}
          >
            Please wait while we connect you...
          </p>
          <Loader2
            style={{
              width: '2rem',
              height: '2rem',
              color: '#fbbf37',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)',
        padding: '2rem 0',
      }}
    >
        {/* Header */}
        <header
          style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            padding: 'var(--space-md) var(--space-lg)',
          }}
        >
          <div
            className="container"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
              }}
            >
              <button
                onClick={handleBack}
                className="btn btn-ghost"
                style={{
                  color: '#d1d5db',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <ArrowLeft
                  style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}
                />
                Back
              </button>
              <div>
                <h1
                  style={{
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '1.25rem',
                    margin: 0,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  Voice Consultation
                </h1>
                <p
                  style={{
                    color: '#d1d5db',
                    fontSize: '0.875rem',
                    margin: '0.25rem 0 0 0',
                  }}
                >
                  Duration: {formatDuration(callDuration)}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleToggleMute}
                className="btn btn-ghost"
                style={{
                  color: isMuted ? '#f87171' : '#d1d5db',
                  border: `1px solid ${
                    isMuted ? 'rgba(248, 113, 113, 0.3)' : 'rgba(255,255,255,0.2)'
                  }`,
                  background: isMuted ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                }}
              >
                {isMuted ? (
                  <MicOff style={{ width: '1.25rem', height: '1.25rem' }} />
                ) : (
                  <Mic style={{ width: '1.25rem', height: '1.25rem' }} />
                )}
              </button>
              <button
                onClick={handleDisconnect}
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                }}
              >
                <PhoneOff
                  style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}
                />
                End Call
              </button>
            </div>
          </div>
        </header>

        {/* Voice Conference */}
        <div
          style={{
            height: 'calc(100vh - 80px)',
            padding: 'var(--space-lg)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '64rem',
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.2)',
              shadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '24rem',
            }}
          >
            {/* Audio Conference */}
            <div style={{ flex: 1, padding: 'var(--space-xl)' }}>
              <LiveKitRoom
                serverUrl={wsUrl}
                token={token}
                onDisconnected={handleDisconnect}
                onError={(err) => setError(`Voice call error: ${err.message}`)}
                onConnected={() => setError('')}
                style={{ height: '100%' }}
              >
                <AudioConference />
              </LiveKitRoom>
            </div>

            {/* Controls */}
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.2)',
                padding: 'var(--space-lg)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 'var(--space-xl)',
                color: '#d1d5db',
                background: 'rgba(0,0,0,0.2)',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Volume2
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    color: '#10b981',
                  }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  Voice Call Active
                </span>
              </div>
              <div
                style={{
                  width: '1px',
                  height: '1.5rem',
                  background: 'rgba(255,255,255,0.2)',
                }}
              ></div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <div
                  style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    borderRadius: '50%',
                    background: isMuted ? '#ef4444' : '#22c55e',
                    boxShadow: `0 0 0 2px rgba(${
                      isMuted ? "239, 68, 68" : "34, 197, 94"
                    }, 0.2)`,
                  }}
                ></div>
                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  {isMuted ? "Muted" : "Unmuted"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile responsive adjustments */}
      <style jsx>{`
        @media (max-width: 768px) {
          header > div {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          header > div > div:last-child {
            width: 100% !important;
            justify-content: space-between !important;
            margin-top: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  )
}