'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, PhoneOff, User, Clock, CheckCircle, XCircle, Video } from 'lucide-react'
import CallNotification from '@/components/CallNotification'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/contexts/AuthContext'

function AstrologerDashboardContent() {
  const [status, setStatus] = useState('offline')
  const [calls, setCalls] = useState([])
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [incomingCall, setIncomingCall] = useState(null)
  const [sseStatus, setSseStatus] = useState('disconnected') // 'connected', 'connecting', 'disconnected', 'error'
  const { getUserId, userProfile } = useAuth()
  const astrologerId = getUserId()
  const router = useRouter()

  useEffect(() => {
    if (!astrologerId) return

    const initializeDashboard = async () => {
      try {
        await Promise.all([
          fetchAstrologerStatus(),
          fetchCalls(),
          fetchQueue()
        ])
      } catch (error) {
        console.error('Error initializing dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeDashboard()

    // Set up Server-Sent Events for real-time updates with retry mechanism
    let eventSource
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    const reconnectDelay = 1000 // Start with 1 second

    const connectSSE = () => {
      try {
        setSseStatus('connecting')
        console.log('Connecting to SSE for astrologer:', astrologerId, `(Attempt ${reconnectAttempts + 1})`)
        eventSource = new EventSource(`/api/events?astrologerId=${astrologerId}`)

        eventSource.onopen = () => {
          console.log('SSE connection opened for astrologer:', astrologerId)
          setSseStatus('connected')
          reconnectAttempts = 0 // Reset reconnect attempts on successful connection
        }

        eventSource.onmessage = (event) => {
          try {
            console.log('Received SSE message:', event.data)
            const data = JSON.parse(event.data)

            switch (data.type) {
              case 'new-call':
                console.log('New call received:', data.call)
                if (data.call.status === 'pending') {
                  setIncomingCall(data.call)
                }
                fetchCalls()
                break
              case 'call-status-updated':
                fetchCalls()
                fetchQueue()
                break
              case 'next-call':
                if (data.call.status === 'pending') {
                  setIncomingCall(data.call)
                }
                fetchCalls()
                fetchQueue()
                break
              case 'connected':
                console.log('Connected to real-time updates')
                setSseStatus('connected')
                break
              case 'heartbeat':
                // Update connection status on heartbeat
                if (sseStatus !== 'connected') {
                  setSseStatus('connected')
                }
                break
            }
          } catch (parseError) {
            console.warn('Error parsing SSE message:', parseError)
          }
        }

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', {
            error,
            readyState: eventSource?.readyState,
            url: eventSource?.url,
            reconnectAttempts,
            timestamp: new Date().toISOString()
          })

          setSseStatus('error')

          // Close the current connection
          if (eventSource) {
            eventSource.close()
          }

          // Implement retry logic with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1) // Exponential backoff
            console.log(`Retrying SSE connection in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)
            setSseStatus('connecting')

            setTimeout(() => {
              connectSSE()
            }, delay)
          } else {
            console.error('Max SSE reconnection attempts reached. Giving up.')
            setSseStatus('disconnected')
          }
        }
      } catch (sseError) {
        console.error('Could not establish SSE connection:', {
          error: sseError,
          reconnectAttempts,
          timestamp: new Date().toISOString()
        })
      }
    }

    // Start the initial connection
    connectSSE()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [astrologerId])

  const fetchAstrologerStatus = async () => {
    try {
      const response = await fetch(`/api/astrologer/status?astrologerId=${astrologerId}`)
      const data = await response.json()
      if (data.success) {
        setStatus(data.status || 'offline')
      } else {
        // If no status found in Firestore, default to offline
        setStatus('offline')
      }
    } catch (error) {
      console.error('Error fetching status:', error)
      setStatus('offline')
    }
  }

  const fetchCalls = async () => {
    try {
      const response = await fetch(`/api/calls?astrologerId=${astrologerId}`)
      const data = await response.json()
      if (data.success) {
        const previousCalls = calls
        const newCalls = data.calls

        // Check for new pending calls
        const newPendingCalls = newCalls.filter(call =>
          call.status === 'pending' &&
          !previousCalls.find(prev => prev.id === call.id)
        )

        if (newPendingCalls.length > 0 && status === 'online') {
          setIncomingCall(newPendingCalls[0])
        }

        setCalls(newCalls)
      }
    } catch (error) {
      console.error('Error fetching calls:', error)
    }
  }

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-queue',
          astrologerId
        })
      })
      const data = await response.json()
      if (data.success) {
        setQueue(data.queue)
      }
    } catch (error) {
      console.error('Error fetching queue:', error)
    }
  }

  const updateStatus = async (newStatus) => {
    try {
      const response = await fetch('/api/astrologer/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          astrologerId,
          status: newStatus,
          action: `set-${newStatus}`
        })
      })

      const data = await response.json()
      if (data.success) {
        setStatus(newStatus)
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleCallAction = async (callId, action) => {
    try {
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-call-status',
          callId,
          astrologerId,
          status: action
        })
      })

      const data = await response.json()
      if (data.success) {
        // If accepting a call, update status to busy and navigate to room
        if (action === 'active') {
          await updateStatus('busy')
          setIncomingCall(null)

          // Wait a moment for the roomName to be generated, then fetch updated calls
          setTimeout(async () => {
            await fetchCalls()
            // Get the updated call data to find the roomName
            const updatedResponse = await fetch(`/api/calls?astrologerId=${astrologerId}`)
            const updatedData = await updatedResponse.json()
            if (updatedData.success) {
              const updatedCall = updatedData.calls.find(call => call.id === callId)
              if (updatedCall?.roomName) {
                router.push(`/talk-to-astrologer/room/${updatedCall.roomName}`)
              } else {
                console.error('Room name not found for call:', callId)
              }
            }
          }, 100)
        } else {
          fetchCalls() // Refresh calls list for other actions
        }

        // If ending a call, set status back to online
        if (action === 'completed') {
          await updateStatus('online')
        }
      }
    } catch (error) {
      console.error('Error updating call:', error)
    }
  }

  const handleAcceptCall = (callId) => {
    handleCallAction(callId, 'active')
  }

  const handleRejectCall = (callId) => {
    handleCallAction(callId, 'rejected')
  }

  const handleCloseNotification = (callId) => {
    setIncomingCall(null)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getSseStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      case 'disconnected': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getSseStatusText = (status) => {
    switch (status) {
      case 'connected': return 'Real-time Connected'
      case 'connecting': return 'Connecting...'
      case 'error': return 'Connection Error'
      case 'disconnected': return 'Disconnected'
      default: return 'Unknown'
    }
  }

  const getCallStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500'
      case 'active': return 'bg-green-500'
      case 'completed': return 'bg-blue-500'
      case 'rejected': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
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
      {incomingCall && (
        <CallNotification
          call={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onClose={handleCloseNotification}
        />
      )}
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {userProfile?.name || 'Astrologer'}</h1>
          <p className="text-gray-600">Manage your availability and handle client calls</p>

          {/* Connection Status */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getSseStatusColor(sseStatus)}`}></div>
              <span className="text-sm text-gray-600">{getSseStatusText(sseStatus)}</span>
            </div>
            {sseStatus === 'error' && (
              <span className="text-xs text-red-600">
                (Will retry automatically)
              </span>
            )}
          </div>
        </div>

        {/* Status Management */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Status</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${getStatusColor(status)}`}></div>
              <span className="text-lg font-medium capitalize">{status}</span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={status === 'online' ? 'default' : 'outline'}
                onClick={() => updateStatus('online')}
                className="flex items-center space-x-2"
              >
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Online</span>
              </Button>
              <Button
                variant={status === 'busy' ? 'default' : 'outline'}
                onClick={() => updateStatus('busy')}
                className="flex items-center space-x-2"
              >
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Busy</span>
              </Button>
              <Button
                variant={status === 'offline' ? 'default' : 'outline'}
                onClick={() => updateStatus('offline')}
                className="flex items-center space-x-2"
              >
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span>Offline</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Call Queue */}
        {queue.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Waiting Queue ({queue.length})</h2>
            <div className="space-y-3">
              {queue.map((queuedCall, index) => (
                <div key={queuedCall.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">User {queuedCall.userId}</p>
                      <p className="text-sm text-gray-600">
                        Waiting since {new Date(queuedCall.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-600">Queued</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Active Calls */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Calls</h2>

          {calls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No calls yet</p>
              <p className="text-sm text-gray-400">Calls will appear here when clients request consultations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {calls.map((call) => (
                <div key={call.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getCallStatusColor(call.status)}`}></div>
                      <div>
                        <p className="font-medium">Call from User {call.userId}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(call.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {call.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleCallAction(call.id, 'active')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCallAction(call.id, 'rejected')}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}

                      {call.status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (call.roomName) {
                                router.push(`/talk-to-astrologer/room/${call.roomName}`)
                              } else {
                                // Fallback: try to fetch updated call data
                                fetchCalls()
                                setTimeout(() => {
                                  const updatedCall = calls.find(c => c.id === call.id)
                                  if (updatedCall?.roomName) {
                                    router.push(`/talk-to-astrologer/room/${updatedCall.roomName}`)
                                  } else {
                                    console.error('Room name not available for call:', call.id)
                                  }
                                }, 200)
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Video className="w-4 h-4 mr-2" />
                            Join Call
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleCallAction(call.id, 'completed')}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <PhoneOff className="w-4 h-4 mr-2" />
                            End Call
                          </Button>
                        </>
                      )}

                      <Badge variant="outline" className={getCallStatusColor(call.status)}>
                        {call.status}
                      </Badge>
                    </div>
                  </div>

                  {call.roomName && (
                    <div className="mt-2 text-sm text-gray-600">
                      Room: {call.roomName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
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



























































// 'use client'

// import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation'
// import { Button } from '@/components/ui/button'
// import { Card } from '@/components/ui/card'
// import { Badge } from '@/components/ui/badge'
// import { Phone, PhoneOff, User, Clock, CheckCircle, XCircle, Video } from 'lucide-react'
// import CallNotification from '@/components/CallNotification'
// import AuthGuard from '@/components/AuthGuard'
// import { useAuth } from '@/contexts/AuthContext'

// function AstrologerDashboardContent() {
//   const [status, setStatus] = useState('offline')
//   const [calls, setCalls] = useState([])
//   const [queue, setQueue] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [incomingCall, setIncomingCall] = useState(null)
//   const [sseStatus, setSseStatus] = useState('disconnected') // 'connected', 'connecting', 'disconnected', 'error'
//   const { getUserId, userProfile } = useAuth()
//   const astrologerId = getUserId()
//   const router = useRouter()

//   useEffect(() => {
//     if (!astrologerId) return

//     const initializeDashboard = async () => {
//       try {
//         await Promise.all([
//           fetchAstrologerStatus(),
//           fetchCalls(),
//           fetchQueue()
//         ])
//       } catch (error) {
//         console.error('Error initializing dashboard:', error)
//       } finally {
//         setLoading(false)
//       }
//     }

//     initializeDashboard()

//     // Set up Server-Sent Events for real-time updates with retry mechanism
//     let eventSource
//     let reconnectAttempts = 0
//     const maxReconnectAttempts = 5
//     const reconnectDelay = 1000 // Start with 1 second

//     const connectSSE = () => {
//       try {
//         setSseStatus('connecting')
//         console.log('Connecting to SSE for astrologer:', astrologerId, `(Attempt ${reconnectAttempts + 1})`)
//         eventSource = new EventSource(`/api/events?astrologerId=${astrologerId}`)

//         eventSource.onopen = () => {
//           console.log('SSE connection opened for astrologer:', astrologerId)
//           setSseStatus('connected')
//           reconnectAttempts = 0 // Reset reconnect attempts on successful connection
//         }

//         eventSource.onmessage = (event) => {
//           try {
//             console.log('Received SSE message:', event.data)
//             const data = JSON.parse(event.data)

//             switch (data.type) {
//               case 'new-call':
//                 console.log('New call received:', data.call)
//                 if (data.call.status === 'pending') {
//                   setIncomingCall(data.call)
//                 }
//                 fetchCalls()
//                 break
//               case 'call-status-updated':
//                 fetchCalls()
//                 fetchQueue()
//                 break
//               case 'next-call':
//                 if (data.call.status === 'pending') {
//                   setIncomingCall(data.call)
//                 }
//                 fetchCalls()
//                 fetchQueue()
//                 break
//               case 'connected':
//                 console.log('Connected to real-time updates')
//                 setSseStatus('connected')
//                 break
//               case 'heartbeat':
//                 // Update connection status on heartbeat
//                 if (sseStatus !== 'connected') {
//                   setSseStatus('connected')
//                 }
//                 break
//             }
//           } catch (parseError) {
//             console.warn('Error parsing SSE message:', parseError)
//           }
//         }

//         eventSource.onerror = (error) => {
//           console.error('SSE connection error:', {
//             error,
//             readyState: eventSource?.readyState,
//             url: eventSource?.url,
//             reconnectAttempts,
//             timestamp: new Date().toISOString()
//           })

//           setSseStatus('error')

//           // Close the current connection
//           if (eventSource) {
//             eventSource.close()
//           }

//           // Implement retry logic with exponential backoff
//           if (reconnectAttempts < maxReconnectAttempts) {
//             reconnectAttempts++
//             const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1) // Exponential backoff
//             console.log(`Retrying SSE connection in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)
//             setSseStatus('connecting')

//             setTimeout(() => {
//               connectSSE()
//             }, delay)
//           } else {
//             console.error('Max SSE reconnection attempts reached. Giving up.')
//             setSseStatus('disconnected')
//           }
//         }
//       } catch (sseError) {
//         console.error('Could not establish SSE connection:', {
//           error: sseError,
//           reconnectAttempts,
//           timestamp: new Date().toISOString()
//         })
//       }
//     }

//     // Start the initial connection
//     connectSSE()

//     return () => {
//       if (eventSource) {
//         eventSource.close()
//       }
//     }
//   }, [astrologerId])

//   const fetchAstrologerStatus = async () => {
//     try {
//       const response = await fetch(`/api/astrologer/status?astrologerId=${astrologerId}`)
//       const data = await response.json()
//       if (data.success) {
//         setStatus(data.status || 'offline')
//       }
//     } catch (error) {
//       console.error('Error fetching status:', error)
//     }
//   }

//   const fetchCalls = async () => {
//     try {
//       const response = await fetch(`/api/calls?astrologerId=${astrologerId}`)
//       const data = await response.json()
//       if (data.success) {
//         const previousCalls = calls
//         const newCalls = data.calls

//         // Check for new pending calls
//         const newPendingCalls = newCalls.filter(call =>
//           call.status === 'pending' &&
//           !previousCalls.find(prev => prev.id === call.id)
//         )

//         if (newPendingCalls.length > 0 && status === 'online') {
//           setIncomingCall(newPendingCalls[0])
//         }

//         setCalls(newCalls)
//       }
//     } catch (error) {
//       console.error('Error fetching calls:', error)
//     }
//   }

//   const fetchQueue = async () => {
//     try {
//       const response = await fetch('/api/calls', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           action: 'get-queue',
//           astrologerId
//         })
//       })
//       const data = await response.json()
//       if (data.success) {
//         setQueue(data.queue)
//       }
//     } catch (error) {
//       console.error('Error fetching queue:', error)
//     }
//   }

//   const updateStatus = async (newStatus) => {
//     try {
//       const response = await fetch('/api/astrologer/status', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           astrologerId,
//           status: newStatus,
//           action: `set-${newStatus}`
//         })
//       })

//       const data = await response.json()
//       if (data.success) {
//         setStatus(newStatus)
//       }
//     } catch (error) {
//       console.error('Error updating status:', error)
//     }
//   }

//   const handleCallAction = async (callId, action) => {
//     try {
//       const response = await fetch('/api/calls', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           action: 'update-call-status',
//           callId,
//           astrologerId,
//           status: action
//         })
//       })

//       const data = await response.json()
//       if (data.success) {
//         // If accepting a call, update status to busy and navigate to room
//         if (action === 'active') {
//           await updateStatus('busy')
//           setIncomingCall(null)

//           // Wait a moment for the roomName to be generated, then fetch updated calls
//           setTimeout(async () => {
//             await fetchCalls()
//             // Get the updated call data to find the roomName
//             const updatedResponse = await fetch(`/api/calls?astrologerId=${astrologerId}`)
//             const updatedData = await updatedResponse.json()
//             if (updatedData.success) {
//               const updatedCall = updatedData.calls.find(call => call.id === callId)
//               if (updatedCall?.roomName) {
//                 router.push(`/talk-to-astrologer/room/${updatedCall.roomName}`)
//               } else {
//                 console.error('Room name not found for call:', callId)
//               }
//             }
//           }, 100)
//         } else {
//           fetchCalls() // Refresh calls list for other actions
//         }

//         // If ending a call, set status back to online
//         if (action === 'completed') {
//           await updateStatus('online')
//         }
//       }
//     } catch (error) {
//       console.error('Error updating call:', error)
//     }
//   }

//   const handleAcceptCall = (callId) => {
//     handleCallAction(callId, 'active')
//   }

//   const handleRejectCall = (callId) => {
//     handleCallAction(callId, 'rejected')
//   }

//   const handleCloseNotification = (callId) => {
//     setIncomingCall(null)
//   }

//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'online': return 'bg-green-500'
//       case 'busy': return 'bg-yellow-500'
//       case 'offline': return 'bg-gray-500'
//       default: return 'bg-gray-500'
//     }
//   }

//   const getSseStatusColor = (status) => {
//     switch (status) {
//       case 'connected': return 'bg-green-500'
//       case 'connecting': return 'bg-yellow-500'
//       case 'error': return 'bg-red-500'
//       case 'disconnected': return 'bg-gray-500'
//       default: return 'bg-gray-500'
//     }
//   }

//   const getSseStatusText = (status) => {
//     switch (status) {
//       case 'connected': return 'Real-time Connected'
//       case 'connecting': return 'Connecting...'
//       case 'error': return 'Connection Error'
//       case 'disconnected': return 'Disconnected'
//       default: return 'Unknown'
//     }
//   }

//   const getCallStatusColor = (status) => {
//     switch (status) {
//       case 'pending': return 'bg-yellow-500'
//       case 'active': return 'bg-green-500'
//       case 'completed': return 'bg-blue-500'
//       case 'rejected': return 'bg-red-500'
//       default: return 'bg-gray-500'
//     }
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
//           <p className="text-gray-600">Loading dashboard...</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <>
//       {incomingCall && (
//         <CallNotification
//           call={incomingCall}
//           onAccept={handleAcceptCall}
//           onReject={handleRejectCall}
//           onClose={handleCloseNotification}
//         />
//       )}
//       <div className="min-h-screen bg-gray-50 py-8">
//         <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
//         {/* Header */}
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {userProfile?.name || 'Astrologer'}</h1>
//           <p className="text-gray-600">Manage your availability and handle client calls</p>

//           {/* Connection Status */}
//           <div className="mt-4 flex items-center space-x-4">
//             <div className="flex items-center space-x-2">
//               <div className={`w-3 h-3 rounded-full ${getSseStatusColor(sseStatus)}`}></div>
//               <span className="text-sm text-gray-600">{getSseStatusText(sseStatus)}</span>
//             </div>
//             {sseStatus === 'error' && (
//               <span className="text-xs text-red-600">
//                 (Will retry automatically)
//               </span>
//             )}
//           </div>
//         </div>

//         {/* Status Management */}
//         <Card className="p-6 mb-8">
//           <h2 className="text-xl font-semibold mb-4">Your Status</h2>
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-4">
//               <div className={`w-4 h-4 rounded-full ${getStatusColor(status)}`}></div>
//               <span className="text-lg font-medium capitalize">{status}</span>
//             </div>
//             <div className="flex space-x-2">
//               <Button
//                 variant={status === 'online' ? 'default' : 'outline'}
//                 onClick={() => updateStatus('online')}
//                 className="flex items-center space-x-2"
//               >
//                 <div className="w-3 h-3 bg-green-500 rounded-full"></div>
//                 <span>Online</span>
//               </Button>
//               <Button
//                 variant={status === 'busy' ? 'default' : 'outline'}
//                 onClick={() => updateStatus('busy')}
//                 className="flex items-center space-x-2"
//               >
//                 <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
//                 <span>Busy</span>
//               </Button>
//               <Button
//                 variant={status === 'offline' ? 'default' : 'outline'}
//                 onClick={() => updateStatus('offline')}
//                 className="flex items-center space-x-2"
//               >
//                 <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
//                 <span>Offline</span>
//               </Button>
//             </div>
//           </div>
//         </Card>

//         {/* Call Queue */}
//         {queue.length > 0 && (
//           <Card className="p-6 mb-8">
//             <h2 className="text-xl font-semibold mb-4">Waiting Queue ({queue.length})</h2>
//             <div className="space-y-3">
//               {queue.map((queuedCall, index) => (
//                 <div key={queuedCall.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
//                   <div className="flex items-center space-x-3">
//                     <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
//                       {index + 1}
//                     </div>
//                     <div>
//                       <p className="font-medium text-gray-900">User {queuedCall.userId}</p>
//                       <p className="text-sm text-gray-600">
//                         Waiting since {new Date(queuedCall.createdAt).toLocaleTimeString()}
//                       </p>
//                     </div>
//                   </div>
//                   <Badge className="bg-blue-600">Queued</Badge>
//                 </div>
//               ))}
//             </div>
//           </Card>
//         )}

//         {/* Active Calls */}
//         <Card className="p-6">
//           <h2 className="text-xl font-semibold mb-4">Recent Calls</h2>

//           {calls.length === 0 ? (
//             <div className="text-center py-8">
//               <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
//               <p className="text-gray-500">No calls yet</p>
//               <p className="text-sm text-gray-400">Calls will appear here when clients request consultations</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {calls.map((call) => (
//                 <div key={call.id} className="border border-gray-200 rounded-lg p-4">
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center space-x-4">
//                       <div className={`w-3 h-3 rounded-full ${getCallStatusColor(call.status)}`}></div>
//                       <div>
//                         <p className="font-medium">Call from User {call.userId}</p>
//                         <p className="text-sm text-gray-500">
//                           {new Date(call.createdAt).toLocaleString()}
//                         </p>
//                       </div>
//                     </div>

//                     <div className="flex items-center space-x-2">
//                       {call.status === 'pending' && (
//                         <>
//                           <Button
//                             size="sm"
//                             onClick={() => handleCallAction(call.id, 'active')}
//                             className="bg-green-600 hover:bg-green-700"
//                           >
//                             <CheckCircle className="w-4 h-4 mr-2" />
//                             Accept
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             onClick={() => handleCallAction(call.id, 'rejected')}
//                             className="border-red-300 text-red-600 hover:bg-red-50"
//                           >
//                             <XCircle className="w-4 h-4 mr-2" />
//                             Reject
//                           </Button>
//                         </>
//                       )}

//                       {call.status === 'active' && (
//                         <>
//                           <Button
//                             size="sm"
//                             onClick={() => {
//                               if (call.roomName) {
//                                 router.push(`/talk-to-astrologer/room/${call.roomName}`)
//                               } else {
//                                 // Fallback: try to fetch updated call data
//                                 fetchCalls()
//                                 setTimeout(() => {
//                                   const updatedCall = calls.find(c => c.id === call.id)
//                                   if (updatedCall?.roomName) {
//                                     router.push(`/talk-to-astrologer/room/${updatedCall.roomName}`)
//                                   } else {
//                                     console.error('Room name not available for call:', call.id)
//                                   }
//                                 }, 200)
//                               }
//                             }}
//                             className="bg-green-600 hover:bg-green-700"
//                           >
//                             <Video className="w-4 h-4 mr-2" />
//                             Join Call
//                           </Button>
//                           <Button
//                             size="sm"
//                             onClick={() => handleCallAction(call.id, 'completed')}
//                             className="bg-red-600 hover:bg-red-700"
//                           >
//                             <PhoneOff className="w-4 h-4 mr-2" />
//                             End Call
//                           </Button>
//                         </>
//                       )}

//                       <Badge variant="outline" className={getCallStatusColor(call.status)}>
//                         {call.status}
//                       </Badge>
//                     </div>
//                   </div>

//                   {call.roomName && (
//                     <div className="mt-2 text-sm text-gray-600">
//                       Room: {call.roomName}
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>
//           )}
//         </Card>
//       </div>
//     </div>
//     </>
//   )
// }

// export default function AstrologerDashboard() {
//   return (
//     <AuthGuard requireAuth={true} allowedRoles={['astrologer']}>
//       <AstrologerDashboardContent />
//     </AuthGuard>
//   )
// }
