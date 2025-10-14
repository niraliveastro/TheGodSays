import { NextResponse } from 'next/server'
import { broadcastEvent } from '../events/route'

// In-memory storage for demo purposes - in production, use a database
// Using global variables to maintain state across function invocations in Vercel
if (typeof global !== 'undefined') {
  if (!global.calls) global.calls = new Map()
  if (!global.astrologers) global.astrologers = new Map()
  var calls = global.calls
  var astrologers = global.astrologers
} else {
  var calls = new Map()
  var astrologers = new Map()
}

// Helper function to get call queue for an astrologer
const getCallQueue = (astrologerId) => {
  const queue = []
  calls.forEach((call) => {
    if (call.astrologerId === astrologerId && call.status === 'queued') {
      queue.push(call.id)
    }
  })
  return queue.sort((a, b) => {
    const callA = calls.get(a)
    const callB = calls.get(b)
    return new Date(callA.createdAt) - new Date(callB.createdAt)
  })
}

// Helper function to process next call in queue
const processNextInQueue = (astrologerId) => {
  const queue = getCallQueue(astrologerId)
  if (queue.length > 0) {
    const nextCallId = queue[0]
    const nextCall = calls.get(nextCallId)
    if (nextCall) {
      nextCall.status = 'pending'
      nextCall.position = null
      calls.set(nextCallId, nextCall)

      // Notify astrologer
      const astrologer = astrologers.get(astrologerId)
      if (astrologer) {
        astrologer.pendingCalls = astrologer.pendingCalls || []
        astrologer.pendingCalls.push(nextCallId)
      }

      return nextCall
    }
  }
  return null
}

export async function POST(request) {
  try {
    const { action, astrologerId, callId, userId, status } = await request.json()

    switch (action) {
      case 'create-call':
        // Check if astrologer is available (initialize if needed)
        let currentAstrologerStatus = astrologers.get(astrologerId)
        if (!currentAstrologerStatus) {
          currentAstrologerStatus = { status: 'online', pendingCalls: [] }
          astrologers.set(astrologerId, currentAstrologerStatus)
        }
        const isAstrologerAvailable = currentAstrologerStatus.status === 'online'

        const call = {
          id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          astrologerId,
          userId,
          status: isAstrologerAvailable ? 'pending' : 'queued',
          createdAt: new Date().toISOString(),
          roomName: null,
          position: null
        }
        calls.set(call.id, call)

        // Add to queue and assign position
        if (!isAstrologerAvailable) {
          const queue = getCallQueue(astrologerId)
          queue.push(call.id)
          call.position = queue.length
          calls.set(call.id, call)
        }

        // Always notify astrologer about incoming call
        const astrologer = astrologers.get(astrologerId)
        if (astrologer) {
          astrologer.pendingCalls = astrologer.pendingCalls || []
          astrologer.pendingCalls.push(call.id)
        }

        // Broadcast real-time event
        console.log('Broadcasting new call event to astrologer:', astrologerId)
        broadcastEvent(astrologerId, {
          type: 'new-call',
          call: call
        })

        return NextResponse.json({ success: true, call })

      case 'update-call-status':
        const callToUpdate = calls.get(callId)
        if (!callToUpdate) {
          return NextResponse.json({ error: 'Call not found' }, { status: 404 })
        }

        const previousStatus = callToUpdate.status
        callToUpdate.status = status
        if (status === 'active' && !callToUpdate.roomName) {
          callToUpdate.roomName = `astro-${astrologerId}-${callToUpdate.userId}-${Date.now()}`
        }

        calls.set(callId, callToUpdate)

        // Broadcast call status update
        broadcastEvent(astrologerId, {
          type: 'call-status-updated',
          call: callToUpdate
        })

        // If call was completed or rejected, process next in queue
        if ((previousStatus === 'active' || previousStatus === 'pending') &&
            (status === 'completed' || status === 'rejected')) {
          const nextCall = processNextInQueue(astrologerId)
          if (nextCall) {
            // Broadcast next call in queue
            broadcastEvent(astrologerId, {
              type: 'next-call',
              call: nextCall
            })
          }
        }

        return NextResponse.json({ success: true, call: callToUpdate })

      case 'get-queue':
        const queue = getCallQueue(astrologerId)
        const queueCalls = queue.map(id => calls.get(id)).filter(Boolean)
        return NextResponse.json({ success: true, queue: queueCalls })

      case 'get-astrologer-calls':
        const astrologerCalls = Array.from(calls.values()).filter(call =>
          call.astrologerId === astrologerId
        )
        return NextResponse.json({ success: true, calls: astrologerCalls })

      case 'poll-pending-calls':
        // Polling fallback for when SSE doesn't work
        const pendingCalls = []
        const currentAstrologer = astrologers.get(astrologerId)
        if (currentAstrologer && currentAstrologer.pendingCalls) {
          currentAstrologer.pendingCalls.forEach(callId => {
            const call = calls.get(callId)
            if (call && (call.status === 'pending' || call.status === 'queued')) {
              pendingCalls.push(call)
            }
          })
        }
        return NextResponse.json({
          success: true,
          pendingCalls,
          timestamp: new Date().toISOString(),
          connectionStatus: 'polling' // Indicate this is polling mode
        })

      case 'connection-status':
        // Check connection status for debugging
        const { hasActiveConnection, getConnectionStatus } = await import('../events/route.js')
        const connectionStatus = getConnectionStatus()
        const hasConnection = hasActiveConnection(astrologerId)
        return NextResponse.json({
          success: true,
          hasActiveConnection: hasConnection,
          connectionStatus,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in calls API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request) {
   try {
     const { searchParams } = new URL(request.url)
     const astrologerId = searchParams.get('astrologerId')

     if (astrologerId) {
       const astrologerCalls = Array.from(calls.values()).filter(call =>
         call.astrologerId === astrologerId
       )
       return NextResponse.json({
         success: true,
         calls: astrologerCalls,
         timestamp: new Date().toISOString()
       }, {
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type',
           'Cache-Control': 'no-cache'
         }
       })
     }

     return NextResponse.json({
       success: true,
       calls: Array.from(calls.values()),
       timestamp: new Date().toISOString()
     }, {
       headers: {
         'Access-Control-Allow-Origin': '*',
         'Access-Control-Allow-Methods': 'GET, OPTIONS',
         'Access-Control-Allow-Headers': 'Content-Type',
         'Cache-Control': 'no-cache'
       }
     })
   } catch (error) {
     console.error('Error fetching calls:', error)
     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
   }
 }


























































// import { NextResponse } from 'next/server'
// import { broadcastEvent } from '../events/route'

// // In-memory storage for demo purposes - in production, use a database
// const calls = new Map()
// const astrologers = new Map()

// // Helper function to get call queue for an astrologer
// const getCallQueue = (astrologerId) => {
//   const queue = []
//   calls.forEach((call) => {
//     if (call.astrologerId === astrologerId && call.status === 'queued') {
//       queue.push(call.id)
//     }
//   })
//   return queue.sort((a, b) => {
//     const callA = calls.get(a)
//     const callB = calls.get(b)
//     return new Date(callA.createdAt) - new Date(callB.createdAt)
//   })
// }

// // Helper function to process next call in queue
// const processNextInQueue = (astrologerId) => {
//   const queue = getCallQueue(astrologerId)
//   if (queue.length > 0) {
//     const nextCallId = queue[0]
//     const nextCall = calls.get(nextCallId)
//     if (nextCall) {
//       nextCall.status = 'pending'
//       nextCall.position = null
//       calls.set(nextCallId, nextCall)

//       // Notify astrologer
//       const astrologer = astrologers.get(astrologerId)
//       if (astrologer) {
//         astrologer.pendingCalls = astrologer.pendingCalls || []
//         astrologer.pendingCalls.push(nextCallId)
//       }

//       return nextCall
//     }
//   }
//   return null
// }

// export async function POST(request) {
//   try {
//     const { action, astrologerId, callId, userId, status } = await request.json()

//     switch (action) {
//       case 'create-call':
//         // Check if astrologer is available (initialize if needed)
//         let currentAstrologerStatus = astrologers.get(astrologerId)
//         if (!currentAstrologerStatus) {
//           currentAstrologerStatus = { status: 'online', pendingCalls: [] }
//           astrologers.set(astrologerId, currentAstrologerStatus)
//         }
//         const isAstrologerAvailable = currentAstrologerStatus.status === 'online'

//         const call = {
//           id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//           astrologerId,
//           userId,
//           status: isAstrologerAvailable ? 'pending' : 'queued',
//           createdAt: new Date().toISOString(),
//           roomName: null,
//           position: null
//         }
//         calls.set(call.id, call)

//         // Add to queue and assign position
//         if (!isAstrologerAvailable) {
//           const queue = getCallQueue(astrologerId)
//           queue.push(call.id)
//           call.position = queue.length
//           calls.set(call.id, call)
//         }

//         // Always notify astrologer about incoming call
//         const astrologer = astrologers.get(astrologerId)
//         if (astrologer) {
//           astrologer.pendingCalls = astrologer.pendingCalls || []
//           astrologer.pendingCalls.push(call.id)
//         }

//         // Broadcast real-time event
//         console.log('Broadcasting new call event to astrologer:', astrologerId)
//         broadcastEvent(astrologerId, {
//           type: 'new-call',
//           call: call
//         })

//         return NextResponse.json({ success: true, call })

//       case 'update-call-status':
//         const callToUpdate = calls.get(callId)
//         if (!callToUpdate) {
//           return NextResponse.json({ error: 'Call not found' }, { status: 404 })
//         }

//         const previousStatus = callToUpdate.status
//         callToUpdate.status = status
//         if (status === 'active' && !callToUpdate.roomName) {
//           callToUpdate.roomName = `astro-${astrologerId}-${callToUpdate.userId}-${Date.now()}`
//         }

//         calls.set(callId, callToUpdate)

//         // Broadcast call status update
//         broadcastEvent(astrologerId, {
//           type: 'call-status-updated',
//           call: callToUpdate
//         })

//         // If call was completed or rejected, process next in queue
//         if ((previousStatus === 'active' || previousStatus === 'pending') &&
//             (status === 'completed' || status === 'rejected')) {
//           const nextCall = processNextInQueue(astrologerId)
//           if (nextCall) {
//             // Broadcast next call in queue
//             broadcastEvent(astrologerId, {
//               type: 'next-call',
//               call: nextCall
//             })
//           }
//         }

//         return NextResponse.json({ success: true, call: callToUpdate })

//       case 'get-queue':
//         const queue = getCallQueue(astrologerId)
//         const queueCalls = queue.map(id => calls.get(id)).filter(Boolean)
//         return NextResponse.json({ success: true, queue: queueCalls })

//       case 'get-astrologer-calls':
//         const astrologerCalls = Array.from(calls.values()).filter(call =>
//           call.astrologerId === astrologerId
//         )
//         return NextResponse.json({ success: true, calls: astrologerCalls })

//       default:
//         return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
//     }
//   } catch (error) {
//     console.error('Error in calls API:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

// export async function GET(request) {
//   try {
//     const { searchParams } = new URL(request.url)
//     const astrologerId = searchParams.get('astrologerId')

//     if (astrologerId) {
//       const astrologerCalls = Array.from(calls.values()).filter(call =>
//         call.astrologerId === astrologerId
//       )
//       return NextResponse.json({ success: true, calls: astrologerCalls })
//     }

//     return NextResponse.json({ success: true, calls: Array.from(calls.values()) })
//   } catch (error) {
//     console.error('Error fetching calls:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }
