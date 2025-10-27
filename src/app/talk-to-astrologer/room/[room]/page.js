'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { ArrowLeft, PhoneOff, Loader2 } from 'lucide-react'

export default function VideoCallRoom() {
  const params = useParams()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [wsUrl, setWsUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const handleDisconnect = () => {
    const role = localStorage.getItem('tgs:role')
    const path = role === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer'
    router.push(path)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a8a, #6b21a8, #4c1d95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 style={{
            width: '3rem',
            height: '3rem',
            color: '#fbbf24',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: 'white', fontSize: '1.125rem' }}>
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
        background: 'linear-gradient(135deg, #1e3a8a, #6b21a8, #4c1d95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}>
        <div style={{
          maxWidth: '28rem',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1rem',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>Warning</div>
          <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Connection Failed
          </h2>
          <p style={{ color: '#d1d5db', marginBottom: '1.5rem' }}>{error}</p>

          <button
            onClick={() => {
              const role = localStorage.getItem('tgs:role')
              router.push(role === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer')
            }}
            className="btn btn-outline"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            Back
          </button>
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
          <p style={{ color: 'white', fontSize: '1.125rem' }}>
            Unable to connect to video call.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a, #6b21a8, #4c1d95)'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        padding: '1rem'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => {
                const role = localStorage.getItem('tgs:role')
                router.push(role === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer')
              }}
              className="btn btn-ghost"
              style={{ color: '#d1d5db' }}
            >
              <ArrowLeft style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
              Back
            </button>
            <h1 style={{ color: 'white', fontWeight: 600 }}>Video Consultation</h1>
          </div>

          <button
            onClick={handleDisconnect}
            className="btn btn-danger"
          >
            <PhoneOff style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
            End Call
          </button>
        </div>
      </header>

      {/* Video Conference */}
      <div style={{
        height: 'calc(100vh - 80px)',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div className="card" style={{
          width: '100%',
          maxWidth: '80rem',
          background: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(8px)',
          borderRadius: '1rem',
          overflow: 'hidden'
        }}>
          <LiveKitRoom
            serverUrl={wsUrl}
            token={token}
            onDisconnected={handleDisconnect}
            onError={(err) => setError(`Video call error: ${err.message}`)}
            style={{ height: '100%' }}
          >
            <VideoConference />
          </LiveKitRoom>
        </div>
      </div>
    </div>
  )
}