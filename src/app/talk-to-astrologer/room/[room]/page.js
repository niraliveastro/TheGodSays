'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { Button } from '@/components/ui/button'
import { ArrowLeft, PhoneOff } from 'lucide-react'

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

        // Get user info from localStorage
        const userRole = localStorage.getItem('tgs:role') || 'user'
        const userId = localStorage.getItem('tgs:userId')
        const astrologerId = localStorage.getItem('tgs:astrologerId')
        
        const isAstrologer = userRole === 'astrologer'
        
        console.log('Video room initialization:', {
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

        if (!response.ok) {
          throw new Error('Failed to create session')
        }

        const data = await response.json()
        setToken(data.token)
        setWsUrl(data.wsUrl)
      } catch (err) {
        console.error('Error initializing video room:', {
          error: err.message,
          roomName: params.room
        })
        setError(`Failed to join video call: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (params.room) {
      initializeRoom()
    }
  }, [params.room])

  const handleDisconnect = () => {
    const userRole = localStorage.getItem('tgs:role')
    const redirectPath = userRole === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer'
    router.push(redirectPath)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Connecting to video call...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-xl font-semibold mb-2">Connection Failed</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <Button onClick={() => {
            const userRole = localStorage.getItem('tgs:role')
            const redirectPath = userRole === 'astrologer' ? '/astrologer-dashboard' : '/talk-to-astrologer'
            router.push(redirectPath)
          }} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    )
  }

  if (!token || !wsUrl) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">Unable to connect to video call.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
            <h1 className="text-white font-semibold">Video Consultation</h1>
          </div>
          <Button
            onClick={handleDisconnect}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            End Call
          </Button>
        </div>
      </div>

      {/* Video Conference */}
      <div className="h-[calc(100vh-80px)] max-w-7xl mx-auto">
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          onDisconnected={handleDisconnect}
          onError={(error) => {
            console.error('LiveKit room error:', error)
            setError(`Video call error: ${error.message}`)
          }}
          style={{ height: '100%' }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  )
}