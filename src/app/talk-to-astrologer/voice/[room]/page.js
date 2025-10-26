'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LiveKitRoom, AudioConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { Button } from '@/components/ui/button'
import { ArrowLeft, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react'

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
      // Get user info from localStorage (outside try block for error handling)
      const userRole = localStorage.getItem('tgs:role') || 'user'
      const userId = localStorage.getItem('tgs:userId')
      const astrologerId = localStorage.getItem('tgs:astrologerId')
      const isAstrologer = userRole === 'astrologer'
      
      try {
        const roomName = params.room
        console.log('Initializing voice room:', roomName)
        
        console.log('Voice room initialization:', {
          roomName,
          userRole,
          userId,
          astrologerId,
          isAstrologer
        })

        if (!userId) {
          throw new Error('User not authenticated - please log in again')
        }

        // Create participant identity based on role
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
            displayName: isAstrologer ? 'Astrologer' : 'User'
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorData = { error: 'Unknown error' }
          try {
            errorData = JSON.parse(errorText)
          } catch (e) {
            errorData = { error: errorText }
          }
          console.error('LiveKit session creation failed:', {
            status: response.status,
            statusText: response.statusText,
            errorData,
            roomName,
            userRole,
            userId,
            isAstrologer,
            participantId
          })
          throw new Error(`Session creation failed: ${errorData.error || 'Unknown error'}`)
        }

        const data = await response.json()
        console.log('LiveKit session created successfully:', {
          hasToken: !!data.token,
          hasWsUrl: !!data.wsUrl,
          roomName: data.roomName,
          wsUrl: data.wsUrl,
          isAstrologer,
          userRole,
          participantId
        })

        if (!data.token || !data.wsUrl) {
          console.error('Invalid session data received:', {
            hasToken: !!data.token,
            hasWsUrl: !!data.wsUrl,
            dataKeys: Object.keys(data),
            roomName,
            isAstrologer,
            userRole,
            participantId
          })
          throw new Error('Invalid session data received from server')
        }

        console.log('Session data validated successfully')

        setToken(data.token)
        setWsUrl(data.wsUrl)
      } catch (err) {
        console.error('Error initializing voice room:', {
          error: err.message,
          roomName: params.room,
          userRole,
          userId,
          isAstrologer
        })
        setError(`Failed to join voice call: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (params.room) {
      initializeRoom()
    }
  }, [params.room])

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleDisconnect = () => {
    console.log('Disconnecting from voice call:', {
      hasToken: !!token,
      hasWsUrl: !!wsUrl,
      roomName: params.room
    })
    // Only redirect if we're actually disconnecting from an active call
    // Don't redirect on initial load errors
    if (token && wsUrl) {
      const userRole = localStorage.getItem('tgs:role')
      const redirectPath = userRole === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer'
      console.log('Redirecting after disconnect to:', redirectPath)
      router.push(redirectPath)
    } else {
      console.log('Not redirecting - no active session')
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Connecting to voice call...</p>
        </div>
      </div>
    )
  }

  if (error) {
    console.error('Voice room error state:', {
      error,
      roomName: params.room,
      hasToken: !!token,
      hasWsUrl: !!wsUrl
    })

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-4">🔇</div>
          <h2 className="text-white text-xl font-semibold mb-2">Connection Failed</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <div className="space-y-2">
            <Button
              onClick={() => {
                console.log('Retrying voice room connection...')
                setError('')
                setLoading(true)
                setToken('')
                setWsUrl('')
                // Retry initialization
                if (params.room) {
                  window.location.reload()
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Retry Connection
            </Button>
            <Button onClick={() => {
              const userRole = localStorage.getItem('tgs:role')
              const redirectPath = userRole === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer'
              router.push(redirectPath)
            }} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!token || !wsUrl) {
    console.log('Voice room waiting for token/wsUrl:', {
      hasToken: !!token,
      hasWsUrl: !!wsUrl,
      roomName: params.room
    })

    // If we've been waiting too long, show an error
    setTimeout(() => {
      if (!token || !wsUrl) {
        console.error('Timeout waiting for LiveKit session data')
        setError('Connection timeout - please try again')
      }
    }, 10000)

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-yellow-400 text-6xl mb-4">⏳</div>
          <h2 className="text-white text-xl font-semibold mb-2">Setting up Voice Call</h2>
          <p className="text-gray-300 mb-4">Please wait while we connect you to the voice call...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black bg-opacity-30 backdrop-blur-sm border-b border-white border-opacity-20 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const userRole = localStorage.getItem('tgs:role')
                const redirectPath = userRole === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer'
                router.push(redirectPath)
              }}
              className="text-gray-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-white font-semibold">Voice Consultation</h1>
              <p className="text-gray-300 text-sm">Duration: {formatDuration(callDuration)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
              className={`text-gray-300 hover:text-white ${isMuted ? 'text-red-400' : ''}`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              onClick={handleDisconnect}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              End Call
            </Button>
          </div>
        </div>
      </div>

      {/* Voice Conference */}
      <div className="h-[calc(100vh-80px)] max-w-4xl mx-auto p-4">
        <div className="bg-black bg-opacity-20 backdrop-blur-sm rounded-lg h-full flex flex-col">
          {/* Audio Conference Component */}
          <div className="flex-1 p-6">
            <LiveKitRoom
              serverUrl={wsUrl}
              token={token}
              onDisconnected={(reason) => {
                console.log('LiveKit room disconnected:', {
                  reason,
                  roomName: params.room
                })
                handleDisconnect()
              }}
              onError={(error) => {
                console.error('LiveKit room error:', {
                  code: error.code,
                  message: error.message,
                  roomName: params.room,
                  hasToken: !!token,
                  hasWsUrl: !!wsUrl
                })
                setError(`Voice call error: ${error.message}`)
                // Don't auto-redirect on connection errors, let user manually disconnect
              }}
              onConnected={() => {
                console.log('Successfully connected to LiveKit room:', {
                  roomName: params.room
                })
                // Clear any previous errors when successfully connected
                setError('')
              }}
              style={{ height: '100%' }}
            >
              <AudioConference />
            </LiveKitRoom>
          </div>

          {/* Voice Call Controls */}
          <div className="border-t border-white border-opacity-20 p-4">
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-300">
                <Volume2 className="w-5 h-5" />
                <span className="text-sm">Voice Call Active</span>
              </div>
              <div className="w-px h-6 bg-white bg-opacity-20"></div>
              <div className="flex items-center space-x-2 text-gray-300">
                <div className={`w-3 h-3 rounded-full ${isMuted ? 'bg-red-400' : 'bg-green-400'}`}></div>
                <span className="text-sm">{isMuted ? 'Muted' : 'Unmuted'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}