'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, PhoneOff, Video, Settings, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { doc, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import CallNotification from '@/components/CallNotification'
import VoiceCallNotification from '@/components/VoiceCallNotification'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/contexts/AuthContext'

function AstrologerDashboardContent() {
  const [status, setStatus] = useState('offline')
  const [calls, setCalls] = useState([])
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [incomingCall, setIncomingCall] = useState(null)
  const { getUserId, userProfile } = useAuth()
  const astrologerId = getUserId()
  const router = useRouter()

  useEffect(() => {
    if (!astrologerId) return

    const unsubAstrologer = onSnapshot(doc(db, 'astrologers', astrologerId), (doc) => {
      const data = doc.data()
      if (data) setStatus(data.status || 'offline')
    })

    const q = query(collection(db, 'calls'), where('astrologerId', '==', astrologerId))

    const unsubCalls = onSnapshot(q, (snapshot) => {
      const callsList = []
      const queueList = []
      let newIncomingCall = null

      snapshot.forEach((doc) => {
        const call = { id: doc.id, ...doc.data() }
        if (call.status === 'pending') newIncomingCall = call
        if (call.status === 'queued') queueList.push(call)
        callsList.push(call)
      })

      setCalls(callsList)
      setQueue(queueList)
      if (newIncomingCall) setIncomingCall(newIncomingCall)
      setLoading(false)
    })

    return () => {
      unsubAstrologer()
      unsubCalls()
    }
  }, [astrologerId])

  const updateStatus = async (newStatus) => {
    if (!astrologerId) return
    try {
      await updateDoc(doc(db, 'astrologers', astrologerId), { status: newStatus })
      setStatus(newStatus)
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleCallAction = async (callId, action) => {
    try {
      const callRef = doc(db, 'calls', callId)
      const updateData = { status: action }
      if (action === 'active') {
        updateData.roomName = `astro-${astrologerId}-${Date.now()}`
      }
      await updateDoc(callRef, updateData)

      if (action === 'active') {
        await updateStatus('busy')
        setIncomingCall(null)

        const call = calls.find(c => c.id === callId) || incomingCall
        if (!call) {
          await updateStatus('online')
          return
        }

        const route = call.callType === 'voice'
          ? `/talk-to-astrologer/voice/${updateData.roomName}`
          : `/talk-to-astrologer/room/${updateData.roomName}`

        localStorage.setItem('tgs:role', 'astrologer')
        localStorage.setItem('tgs:astrologerId', astrologerId)
        localStorage.setItem('tgs:userId', astrologerId)

        const sessionResponse = await fetch('/api/livekit/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            astrologerId,
            userId: astrologerId,
            roomName: updateData.roomName,
            callType: call.callType || 'video',
            role: 'astrologer',
            displayName: userProfile?.name || 'Astrologer'
          })
        })

        if (sessionResponse.ok) {
          router.push(route)
        } else {
          const error = await sessionResponse.json().catch(() => ({}))
          alert(`Failed to join call: ${error.error || 'Try again.'}`)
          await updateStatus('online')
        }
      } else if (action === 'completed' || action === 'rejected') {
        await updateStatus('online')
      }
    } catch (error) {
      console.error('Call action error:', error)
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'online': return '#10b981'
      case 'busy': return '#f59e0b'
      case 'offline': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getCallStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'active': return '#10b981'
      case 'completed': return '#3b82f6'
      case 'rejected': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // Helper to safely parse Firebase Timestamp to Date
  const safeParseDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return null
    const ms = timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000
    const date = new Date(ms)
    return isNaN(date.getTime()) ? null : date
  }

  // Helper to format date safely
  const formatDate = (timestamp, fallback = 'N/A') => {
    const date = safeParseDate(timestamp)
    return date ? date.toLocaleString() : fallback
  }

  // Helper to format time only
  const formatTime = (timestamp, fallback = 'Unknown time') => {
    const date = safeParseDate(timestamp)
    return date ? date.toLocaleTimeString() : fallback
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Incoming Call Notification - Enhanced with better props for styling */}
      {incomingCall && (
        incomingCall.callType === 'voice' ? (
          <VoiceCallNotification
            call={incomingCall}
            onAccept={() => handleCallAction(incomingCall.id, 'active')}
            onReject={() => handleCallAction(incomingCall.id, 'rejected')}
            onClose={() => setIncomingCall(null)}
            // Suggested props for improved style (pass to your component)
            theme="golden" // Custom theme for astrologer app
            showAvatar={true} // Show user avatar if available
            animation="slide-down" // Entrance animation
            buttonSize="lg" // Larger buttons for better UX
            background="linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)" // Match dashboard
          />
        ) : (
          <CallNotification
            call={incomingCall}
            onAccept={() => handleCallAction(incomingCall.id, 'active')}
            onReject={() => handleCallAction(incomingCall.id, 'rejected')}
            onClose={() => setIncomingCall(null)}
            // Suggested props for improved style
            theme="golden"
            showAvatar={true}
            animation="slide-down"
            buttonSize="lg"
            background="linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)"
          />
        )
      )}

      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)', padding: '2rem 0' }}>
        <div className="container">
          {/* Header */}
          <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 500, color: 'var(--color-gray-900)' }}>
                Welcome, {userProfile?.name || 'Astrologer'}
              </h1>
              <p style={{ color: 'var(--color-gray-600)', fontSize: '1rem' }}>
                Manage your availability and handle client calls
              </p>
            </div>
            <button
              onClick={() => router.push('/astrologer-dashboard/pricing')}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
            >
              <Settings style={{ width: '1rem', height: '1rem' }} />
              Pricing Settings
            </button>
          </header>

          {/* Status Card - Enhanced with subtle shadow and hover */}
          <div className="card" style={{ 
            marginBottom: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '12px',
            padding: '1.5rem',
            background: 'white',
            transition: 'box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Your Status</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '1rem',
                  height: '1rem',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(status),
                  boxShadow: '0 0 0 2px white, 0 0 0 4px rgba(16, 185, 129, 0.2)' // Glow effect
                }}></div>
                <span style={{ textTransform: 'capitalize', fontWeight: 500, fontSize: '1.125rem' }}>
                  {status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {['online', 'busy', 'offline'].map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className={`btn ${status === s ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      padding: '0.5rem 1rem', 
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                      background: status === s ? '#10b981' : 'white',
                      color: status === s ? 'white' : '#6b7280',
                      border: status === s ? '1px solid #10b981' : '1px solid #d1d5db'
                    }}
                    onMouseEnter={(e) => {
                      if (status !== s) {
                        e.currentTarget.style.background = '#f3f4f6'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (status !== s) {
                        e.currentTarget.style.background = 'white'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }
                    }}
                  >
                    <div style={{
                      width: '0.75rem',
                      height: '0.75rem',
                      borderRadius: '50%',
                      backgroundColor: s === 'online' ? '#10b981' : s === 'busy' ? '#f59e0b' : '#6b7280'
                    }}></div>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Queue - Enhanced with better visuals */}
          {queue.length > 0 && (
            <div className="card" style={{ 
              marginBottom: '2rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              borderRadius: '12px',
              padding: '1.5rem',
              background: 'white'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
                Waiting Queue ({queue.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {queue.map((call, i) => (
                  <div
                    key={call.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                      border: '1px solid #93c5fd',
                      borderRadius: '12px',
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        color: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1rem',
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                      }}>
                        {i + 1}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>
                          {call.callType === 'voice' ? 'Voice Call' : 'Video Call'} - User {call.userId?.slice(-4) || 'Unknown'}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                          Waiting since {formatTime(call.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span style={{
                      padding: '0.375rem 0.875rem',
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      color: 'white',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      boxShadow: '0 1px 2px rgba(59, 130, 246, 0.25)'
                    }}>
                      Queued
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Calls - Enhanced with better card styles */}
          <div className="card" style={{ 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '12px',
            padding: '1.5rem',
            background: 'white'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Calls</h2>

            {calls.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <Phone style={{ width: '3rem', height: '3rem', color: 'var(--color-gray-400)', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--color-gray-500)', marginBottom: '0.5rem' }}>No calls yet</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-400)' }}>
                  Calls will appear here when clients request consultations
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {calls.map(call => (
                  <div
                    key={call.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      background: 'white',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                      e.currentTarget.style.borderColor = getCallStatusColor(call.status) + '20'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '0.875rem',
                          height: '0.875rem',
                          borderRadius: '50%',
                          backgroundColor: getCallStatusColor(call.status),
                          boxShadow: `0 0 0 2px white, 0 0 0 4px ${getCallStatusColor(call.status)}20`
                        }}></div>
                        <div>
                          <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>
                            {call.callType === 'voice' ? 'Voice Call' : 'Video Call'} from User {call.userId?.slice(-4) || 'Unknown'}
                          </p>
                          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0', fontFamily: 'Courier New, monospace' }}>
                            {formatDate(call.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {call.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleCallAction(call.id, 'active')}
                              className="btn btn-primary"
                              style={{ 
                                padding: '0.75rem 1.25rem', 
                                fontSize: '0.875rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.375rem',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                border: 'none',
                                color: 'white',
                                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)'
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)'
                              }}
                            >
                              <CheckCircle style={{ width: '1rem', height: '1rem' }} />
                              Accept
                            </button>
                            <button
                              onClick={() => handleCallAction(call.id, 'rejected')}
                              className="btn btn-ghost"
                              style={{ 
                                padding: '0.75rem 1.25rem', 
                                fontSize: '0.875rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.375rem', 
                                borderRadius: '8px',
                                background: 'white',
                                border: '1px solid #fca5a5',
                                color: '#dc2626',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fee2e2'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white'
                                e.currentTarget.style.transform = 'translateY(0)'
                              }}
                            >
                              <XCircle style={{ width: '1rem', height: '1rem' }} />
                              Reject
                            </button>
                          </>
                        )}

                        {call.status === 'active' && (
                          <>
                            <button
                              onClick={async () => {
                                if (!call.roomName) return alert('Room not ready.')

                                localStorage.setItem('tgs:role', 'astrologer')
                                localStorage.setItem('tgs:astrologerId', astrologerId)
                                localStorage.setItem('tgs:userId', astrologerId)

                                const res = await fetch('/api/livekit/create-session', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    astrologerId,
                                    userId: astrologerId,
                                    roomName: call.roomName,
                                    callType: call.callType || 'video',
                                    role: 'astrologer',
                                    displayName: userProfile?.name || 'Astrologer'
                                  })
                                })

                                if (res.ok) {
                                  router.push(
                                    call.callType === 'voice'
                                      ? `/talk-to-astrologer/voice/${call.roomName}`
                                      : `/talk-to-astrologer/room/${call.roomName}`
                                  )
                                } else {
                                  alert('Failed to join call.')
                                }
                              }}
                              className="btn btn-primary"
                              style={{ 
                                padding: '0.75rem 1.25rem', 
                                fontSize: '0.875rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.375rem',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                border: 'none',
                                color: 'white',
                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)'
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)'
                              }}
                            >
                              {call.callType === 'voice' ? <Phone style={{ width: '1rem', height: '1rem' }} /> : <Video style={{ width: '1rem', height: '1rem' }} />}
                              Join {call.callType === 'voice' ? 'Voice' : 'Video'}
                            </button>
                            <button
                              onClick={() => handleCallAction(call.id, 'completed')}
                              className="btn btn-ghost"
                              style={{ 
                                padding: '0.75rem 1.25rem', 
                                fontSize: '0.875rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.375rem', 
                                borderRadius: '8px',
                                background: 'white',
                                border: '1px solid #fca5a5',
                                color: '#dc2626',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fee2e2'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white'
                                e.currentTarget.style.transform = 'translateY(0)'
                              }}
                            >
                              <PhoneOff style={{ width: '1rem', height: '1rem' }} />
                              End
                            </button>
                          </>
                        )}

                        <span style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: getCallStatusColor(call.status) + '10',
                          color: getCallStatusColor(call.status),
                          border: `1px solid ${getCallStatusColor(call.status)}30`,
                          textTransform: 'capitalize'
                        }}>
                          {call.status}
                        </span>
                      </div>
                    </div>

                    {call.roomName && (
                      <div style={{ 
                        marginTop: '0.75rem', 
                        fontSize: '0.875rem', 
                        color: '#9ca3af',
                        padding: '0.5rem',
                        background: '#f9fafb',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${getCallStatusColor(call.status)}`
                      }}>
                        Room: <code style={{ fontFamily: 'monospace', color: '#6b7280' }}>{call.roomName}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function AstrologerDashboard() {
  return (
    <AuthGuard requireAuth={true} allowedRoles={['astrologer']}>
      <AstrologerDashboardContent />
    </AuthGuard>
  )
}