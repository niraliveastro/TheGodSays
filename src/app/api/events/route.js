import { NextResponse } from 'next/server'

// Store active SSE connections
const connections = new Map()
const globalConnections = new Set()

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const astrologerId = searchParams.get('astrologerId')
    const isGlobal = searchParams.get('global') === 'true'

    if (!astrologerId && !isGlobal) {
      console.error('SSE request missing required parameters:', { astrologerId, isGlobal })
      return NextResponse.json({ error: 'Astrologer ID or global flag is required' }, { status: 400 })
    }

    console.log('SSE connection request:', { astrologerId, isGlobal, timestamp: new Date().toISOString() })

    // Create SSE response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        try {
          const connectionInfo = { astrologerId, isGlobal, timestamp: new Date().toISOString() }

          if (isGlobal) {
            // Store global connection
            globalConnections.add(controller)
            console.log('Global SSE connection established:', connectionInfo)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', global: true, timestamp: new Date().toISOString() })}\n\n`))

            request.signal.addEventListener('abort', () => {
              globalConnections.delete(controller)
              console.log('Global SSE connection closed:', connectionInfo)
              controller.close()
            })
          } else if (astrologerId) {
            // Store astrologer-specific connection
            connections.set(astrologerId, controller)
            console.log('Astrologer SSE connection established:', connectionInfo)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', astrologerId, timestamp: new Date().toISOString() })}\n\n`))

            request.signal.addEventListener('abort', () => {
              connections.delete(astrologerId)
              console.log('Astrologer SSE connection closed:', connectionInfo)
              controller.close()
            })
          }

          // Add heartbeat to keep connection alive
          const heartbeatInterval = setInterval(() => {
            try {
              if (!controller.desiredSize || controller.desiredSize > 0) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`))
              }
            } catch (error) {
              console.error('Error sending heartbeat:', error)
              clearInterval(heartbeatInterval)
            }
          }, 30000) // Send heartbeat every 30 seconds

          // Clean up heartbeat on connection close
          request.signal.addEventListener('abort', () => {
            clearInterval(heartbeatInterval)
          })

        } catch (error) {
          console.error('Error in SSE stream start:', error)
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  } catch (error) {
    console.error('Error in SSE route:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Function to broadcast events to connected clients
export function broadcastEvent(astrologerId, eventData) {
  if (!astrologerId || !eventData) {
    console.warn('Invalid parameters for broadcastEvent:', { astrologerId, eventData })
    return false
  }

  console.log('Attempting to broadcast to astrologer:', astrologerId, 'Event type:', eventData.type)
  console.log('Active connections:', Array.from(connections.keys()))

  const controller = connections.get(astrologerId)
  if (controller) {
    try {
      // Check if controller is still writable
      if (controller.desiredSize !== null && controller.desiredSize <= 0) {
        console.warn('Controller buffer is full, skipping broadcast')
        return false
      }

      const encoder = new TextEncoder()
      const message = `data: ${JSON.stringify({ ...eventData, timestamp: new Date().toISOString() })}\n\n`
      controller.enqueue(encoder.encode(message))
      console.log('Event broadcasted successfully to astrologer:', astrologerId)
      return true
    } catch (error) {
      console.error('Error broadcasting event to astrologer:', astrologerId, error)
      connections.delete(astrologerId)
      return false
    }
  } else {
    console.log('No active connection found for astrologer:', astrologerId)
    return false
  }
}

// Function to broadcast to all global connections
export function broadcastGlobal(eventData) {
  if (!eventData) {
    console.warn('Invalid parameters for broadcastGlobal:', eventData)
    return 0
  }

  const encoder = new TextEncoder()
  const toRemove = []
  let successCount = 0

  console.log('Broadcasting to global connections, count:', globalConnections.size)

  globalConnections.forEach(controller => {
    try {
      // Check if controller is still writable
      if (controller.desiredSize !== null && controller.desiredSize <= 0) {
        console.warn('Global controller buffer is full, marking for removal')
        toRemove.push(controller)
        return
      }

      const message = `data: ${JSON.stringify({ ...eventData, timestamp: new Date().toISOString() })}\n\n`
      controller.enqueue(encoder.encode(message))
      successCount++
    } catch (error) {
      console.error('Error broadcasting global event:', error)
      toRemove.push(controller)
    }
  })

  // Clean up failed connections
  toRemove.forEach(controller => globalConnections.delete(controller))

  if (toRemove.length > 0) {
    console.log('Cleaned up failed global connections:', toRemove.length)
  }

  console.log(`Global broadcast completed. Success: ${successCount}, Failed: ${toRemove.length}`)
  return successCount
}