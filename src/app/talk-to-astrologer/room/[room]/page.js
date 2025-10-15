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
    const initializeRoom = async (retryCount = 0) => {
      try {
        const roomName = params.room

        // Get user role from localStorage or auth context
        const userRole = typeof window !== 'undefined' ? localStorage.getItem('tgs:role') : null
        const isAstrologer = userRole === 'astrologer'

        // Create participant identity based on role
        const participantId = isAstrologer
          ? `astrologer-${roomName}`
          : `user-${roomName}`

        console.log('Initializing LiveKit room:', {
          roomName,
          participantId,
          isAstrologer,
          retryCount
        })

        const response = await fetch('/api/livekit/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            astrologerId: isAstrologer ? 'astrologer' : 'user-session',
            userId: participantId,
            roomName
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Failed to create session: ${response.status} ${errorData.error || response.statusText}`)
        }

        const data = await response.json()
        console.log('LiveKit session created:', {
          hasToken: !!data.token,
          hasWsUrl: !!data.wsUrl,
          wsUrl: data.wsUrl
        })

        setToken(data.token)
        setWsUrl(data.wsUrl)
      } catch (err) {
        console.error('Error initializing room:', err)
        console.error('Room name:', roomName)
        console.error('Participant role:', typeof window !== 'undefined' ? localStorage.getItem('tgs:role') : 'unknown')
        console.error('Retry count:', retryCount)

        // Retry up to 3 times with exponential backoff
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
          console.log(`Retrying in ${delay}ms...`)
          setTimeout(() => initializeRoom(retryCount + 1), delay)
          return
        }

        setError(`Failed to join video call after ${retryCount + 1} attempts: ${err.message}`)
      } finally {
        if (retryCount === 0) {
          setLoading(false)
        }
      }
    }

    if (params.room) {
      initializeRoom()
    }
  }, [params.room])

  const handleDisconnect = () => {
    router.push('/talk-to-astrologer')
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
          <Button onClick={() => router.push('/talk-to-astrologer')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Astrologers
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
              onClick={() => router.push('/talk-to-astrologer')}
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
      <div className="h-[calc(100vh-80px)] video-conference-wrapper">
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          onDisconnected={handleDisconnect}
          onError={(error) => {
            console.error('LiveKit room error:', error)
            console.error('LiveKit error details:', {
              message: error.message,
              code: error.code,
              type: error.type,
              stack: error.stack
            })
            setError(`Video call error: ${error.message}. Please check your internet connection and try again.`)
          }}
          style={{ height: '100%' }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  )
}

















































// 'use client'

// import { useEffect, useState } from 'react'
// import { useParams, useRouter } from 'next/navigation'
// import { LiveKitRoom, StageView, ControlsView } from '@livekit/react-components'
// import '@livekit/react-components/dist/index.css'
// import { Button } from '@/components/ui/button'
// import { ArrowLeft, PhoneOff } from 'lucide-react'

// export default function VideoCallRoom() {
//   const params = useParams()
//   const router = useRouter()
//   const [token, setToken] = useState('')
//   const [wsUrl, setWsUrl] = useState('')
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState('')

//   useEffect(() => {
//     const initializeRoom = async () => {
//       try {
//         const roomName = params.room

//         // Get user role from localStorage or auth context
//         const userRole = typeof window !== 'undefined' ? localStorage.getItem('tgs:role') : null
//         const isAstrologer = userRole === 'astrologer'

//         // Create participant identity based on role
//         const participantId = isAstrologer
//           ? `astrologer-${roomName}`
//           : `user-${roomName}`

//         const response = await fetch('/api/livekit/create-session', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             astrologerId: isAstrologer ? 'astrologer' : 'user-session',
//             userId: participantId,
//             roomName
//           })
//         })

//         if (!response.ok) {
//           throw new Error('Failed to create session')
//         }

//         const data = await response.json()
//         setToken(data.token)
//         setWsUrl(data.wsUrl)
//       } catch (err) {
//         console.error('Error initializing room:', err)
//         console.error('Room name:', roomName)
//         console.error('Participant role:', typeof window !== 'undefined' ? localStorage.getItem('tgs:role') : 'unknown')
//         setError(`Failed to join video call: ${err.message}`)
//       } finally {
//         setLoading(false)
//       }
//     }

//     if (params.room) {
//       initializeRoom()
//     }
//   }, [params.room])

//   const handleDisconnect = () => {
//     router.push('/talk-to-astrologer')
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-900 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
//           <p className="text-white">Connecting to video call...</p>
//         </div>
//       </div>
//     )
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gray-900 flex items-center justify-center">
//         <div className="text-center max-w-md mx-auto p-6">
//           <div className="text-red-500 text-6xl mb-4">⚠️</div>
//           <h2 className="text-white text-xl font-semibold mb-2">Connection Failed</h2>
//           <p className="text-gray-300 mb-6">{error}</p>
//           <Button onClick={() => router.push('/talk-to-astrologer')} variant="outline">
//             <ArrowLeft className="w-4 h-4 mr-2" />
//             Back to Astrologers
//           </Button>
//         </div>
//       </div>
//     )
//   }

//   if (!token || !wsUrl) {
//     return (
//       <div className="min-h-screen bg-gray-900 flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-white">Unable to connect to video call.</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gray-900">
//       {/* Header */}
//       <div className="bg-gray-800 border-b border-gray-700 p-4">
//         <div className="max-w-7xl mx-auto flex items-center justify-between">
//           <div className="flex items-center space-x-4">
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={() => router.push('/talk-to-astrologer')}
//               className="text-gray-300 hover:text-white"
//             >
//               <ArrowLeft className="w-4 h-4 mr-2" />
//               Back
//             </Button>
//             <h1 className="text-white font-semibold">Video Consultation</h1>
//           </div>
//           <Button
//             onClick={handleDisconnect}
//             className="bg-red-600 hover:bg-red-700 text-white"
//           >
//             <PhoneOff className="w-4 h-4 mr-2" />
//             End Call
//           </Button>
//         </div>
//       </div>

//       {/* Video Conference */}
//       <div className="h-[calc(100vh-80px)]">
//         <LiveKitRoom
//           url={wsUrl}
//           token={token}
//           onDisconnected={handleDisconnect}
//           onError={(error) => {
//             console.error('LiveKit room error:', error)
//             setError(`Video call error: ${error.message}`)
//           }}
//           style={{ height: '100%' }}
//         >
//           <StageView />
//           <ControlsView />
//         </LiveKitRoom>
//       </div>
//     </div>
//   )
// }
