import { NextResponse } from 'next/server'
import { broadcastEvent } from '../events/route'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

const db = getFirestore()

// Helper function to get calls from Firestore
async function getCallsFromFirestore(astrologerId = null) {
  try {
    let query = db.collection('calls')
    if (astrologerId) {
      query = query.where('astrologerId', '==', astrologerId)
    }

    const snapshot = await query.get()
    const calls = []
    snapshot.forEach(doc => {
      calls.push({ id: doc.id, ...doc.data() })
    })
    return calls
  } catch (error) {
    console.error('Error fetching calls from Firestore:', error)
    return []
  }
}

// Helper function to save call to Firestore
async function saveCallToFirestore(callData) {
  try {
    const docRef = db.collection('calls').doc(callData.id)
    await docRef.set(callData, { merge: true })
    return true
  } catch (error) {
    console.error('Error saving call to Firestore:', error)
    return false
  }
}

// Helper function to get call queue for an astrologer
const getCallQueue = (calls, astrologerId) => {
  return calls
    .filter(call => call.astrologerId === astrologerId && call.status === 'queued')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(call => call.id)
}

// Helper function to process next call in queue
const processNextInQueue = (calls, astrologerId) => {
  const queue = getCallQueue(calls, astrologerId)
  if (queue.length > 0) {
    const nextCallId = queue[0]
    const nextCallIndex = calls.findIndex(call => call.id === nextCallId)
    if (nextCallIndex !== -1) {
      calls[nextCallIndex].status = 'pending'
      calls[nextCallIndex].position = null
      return calls[nextCallIndex]
    }
  }
  return null
}

export async function POST(request) {
  try {
    const { action, astrologerId, callId, userId, status } = await request.json()

    switch (action) {
      case 'create-call':
        // Get current astrologer status from the status API
        const statusResponse = await fetch(`${request.nextUrl.origin}/api/astrologer/status?astrologerId=${astrologerId}`)
        const statusData = await statusResponse.json()
        const isAstrologerAvailable = statusData.success && statusData.status === 'online'

        // Generate room name immediately
        const roomName = `astro-${astrologerId}-${userId}-${Date.now()}`

        const call = {
          id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          astrologerId,
          userId,
          status: isAstrologerAvailable ? 'pending' : 'queued',
          createdAt: new Date().toISOString(),
          roomName: roomName,
          position: null
        }

        // Add to queue and assign position if not available
        if (!isAstrologerAvailable) {
          // Get existing calls to determine queue position
          const existingCalls = await getCallsFromFirestore(astrologerId)
          const queueLength = existingCalls.filter(c => c.status === 'queued').length
          call.position = queueLength + 1
        }

        // Save call to Firestore
        const saveSuccess = await saveCallToFirestore(call)
        if (!saveSuccess) {
          return NextResponse.json({ error: 'Failed to save call' }, { status: 500 })
        }

        // Broadcast real-time event
        console.log('Broadcasting new call event to astrologer:', astrologerId)
        broadcastEvent(astrologerId, {
          type: 'new-call',
          call: call
        })

        return NextResponse.json({ success: true, call })

      case 'update-call-status':
        // Get call from Firestore
        const calls = await getCallsFromFirestore(astrologerId)
        const callToUpdate = calls.find(call => call.id === callId)

        if (!callToUpdate) {
          return NextResponse.json({ error: 'Call not found' }, { status: 404 })
        }

        const previousStatus = callToUpdate.status
        callToUpdate.status = status

        // Generate room name if call is being activated and doesn't have one
        if (status === 'active' && !callToUpdate.roomName) {
          callToUpdate.roomName = `astro-${astrologerId}-${callToUpdate.userId}-${Date.now()}`
        }

        // Save updated call to Firestore
        const updateSuccess = await saveCallToFirestore(callToUpdate)
        if (!updateSuccess) {
          return NextResponse.json({ error: 'Failed to update call' }, { status: 500 })
        }

        // Broadcast call status update
        broadcastEvent(astrologerId, {
          type: 'call-status-updated',
          call: callToUpdate
        })

        // If call was completed or rejected, process next in queue
        if ((previousStatus === 'active' || previousStatus === 'pending') &&
            (status === 'completed' || status === 'rejected')) {
          const updatedCalls = await getCallsFromFirestore(astrologerId)
          const nextCall = processNextInQueue(updatedCalls, astrologerId)
          if (nextCall) {
            // Save next call status change
            await saveCallToFirestore(nextCall)
            // Broadcast next call in queue
            broadcastEvent(astrologerId, {
              type: 'next-call',
              call: nextCall
            })
          }
        }

        return NextResponse.json({ success: true, call: callToUpdate })

      case 'get-queue':
        const allCalls = await getCallsFromFirestore(astrologerId)
        const queue = getCallQueue(allCalls, astrologerId)
        const queueCalls = allCalls.filter(call => queue.includes(call.id))
        return NextResponse.json({ success: true, queue: queueCalls })

      case 'get-astrologer-calls':
        const astrologerCalls = await getCallsFromFirestore(astrologerId)
        return NextResponse.json({ success: true, calls: astrologerCalls })

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

    const calls = await getCallsFromFirestore(astrologerId ? astrologerId : null)

    return NextResponse.json({ success: true, calls })
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
