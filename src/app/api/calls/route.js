import { NextResponse } from 'next/server'
import { broadcastEvent } from '../events/route'

// In-memory storage for demo purposes - in production, use a database
const calls = new Map()
const astrologers = new Map()

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
      return NextResponse.json({ success: true, calls: astrologerCalls })
    }

    return NextResponse.json({ success: true, calls: Array.from(calls.values()) })
  } catch (error) {
    console.error('Error fetching calls:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
