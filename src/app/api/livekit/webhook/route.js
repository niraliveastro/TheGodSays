import { NextResponse } from 'next/server'
import { WebhookReceiver } from 'livekit-server-sdk'
import { CallStateMachine } from '@/lib/callStateMachine'
import { PerSecondBillingService } from '@/lib/perSecondBilling'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Initialize LiveKit webhook receiver
const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
)

/**
 * POST /api/livekit/webhook
 * 
 * LiveKit webhook endpoint for room events
 * 
 * Handles:
 * - participant_joined: Mark participant as joined
 * - participant_left: Mark participant as left (may trigger finalization)
 * - track_published: Mark audio track as published (starts billing)
 * - track_unpublished: Handle track unpublished
 * 
 * IMPORTANT: This endpoint must be configured in LiveKit dashboard
 * Webhook URL: https://yourdomain.com/api/livekit/webhook
 */
export async function POST(request) {
  try {
    // Get webhook event from LiveKit
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const body = await request.text()
    
    // Verify and decode webhook
    const event = receiver.receive(body, authHeader)
    
    console.log('📥 LiveKit webhook event:', event.event, event.room?.name)

    // Extract call ID from room name
    // Room name format: astro-{astrologerId}-{userId}-{timestamp}-{callType}
    const roomName = event.room?.name
    if (!roomName) {
      console.warn('⚠️ No room name in webhook event')
      return NextResponse.json({ success: true, message: 'No room name' })
    }

    // Find call by room name
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    
    // Try to find call by roomName first
    let callsSnapshot = await db.collection('calls')
      .where('roomName', '==', roomName)
      .limit(1)
      .get()

    // If not found by roomName, try to extract callId from roomName
    // Room name format: astro-{astrologerId}-{userId}-{timestamp}-{callType}
    // Or try to find by matching pattern
    if (callsSnapshot.empty) {
      console.warn(`⚠️ No call found for room ${roomName}, trying alternative lookup...`)
      
      // Try to find recent calls (within last 5 minutes) that might match
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
      callsSnapshot = await db.collection('calls')
        .where('status', 'in', ['pending', 'active', 'connected', 'billing_active'])
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
      
      // Try to match by checking if roomName contains astrologerId or userId
      const matchingCall = callsSnapshot.docs.find(doc => {
        const data = doc.data()
        return data.roomName === roomName || 
               (data.astrologerId && roomName.includes(data.astrologerId)) ||
               (data.userId && roomName.includes(data.userId))
      })
      
      if (matchingCall) {
        callsSnapshot = {
          docs: [matchingCall],
          empty: false
        }
      }
    }

    if (callsSnapshot.empty) {
      console.warn(`⚠️ No call found for room ${roomName} after alternative lookup`)
      return NextResponse.json({ success: true, message: 'Call not found' })
    }

    const callDoc = callsSnapshot.docs[0]
    const callId = callDoc.id
    const callData = callDoc.data()
    
    console.log(`📋 Found call ${callId} for room ${roomName}, status: ${callData.status}`)

    // Handle different event types
    switch (event.event) {
      case 'participant_joined': {
        const participant = event.participant
        const identity = participant?.identity || ''
        
        // Determine participant type from identity
        let participantType = null
        if (identity.startsWith('user-')) {
          participantType = 'user'
        } else if (identity.startsWith('astrologer-')) {
          participantType = 'astrologer'
        }
        
        if (participantType) {
          await CallStateMachine.markParticipantJoined(callId, participantType)
          console.log(`✅ Participant ${participantType} joined call ${callId}`)
        }
        
        break
      }

      case 'participant_left': {
        const participant = event.participant
        const identity = participant?.identity || ''
        
        // Determine participant type
        let participantType = null
        if (identity.startsWith('user-')) {
          participantType = 'user'
        } else if (identity.startsWith('astrologer-')) {
          participantType = 'astrologer'
        }
        
        if (participantType) {
          const result = await CallStateMachine.markParticipantLeft(callId, participantType)
          
          // If billing should be finalized, do it
          if (result.shouldFinalize) {
            await PerSecondBillingService.finalizeBilling(callId, 'participant_left')
            console.log(`✅ Finalized billing for call ${callId} (participant left)`)
          }
        }
        
        break
      }

      case 'track_published': {
        const track = event.track
        const source = track?.source
        
        // Only audio track published triggers billing
        if (source === 'microphone' || source === 1) { // Track.Source.Microphone = 1
          const result = await CallStateMachine.markAudioTrackPublished(callId)
          
          // If billing can start, start it
          if (result.canStartBilling) {
            try {
              await PerSecondBillingService.startBilling(callId)
              console.log(`✅ Started billing for call ${callId} (audio track published)`)
            } catch (billingError) {
              console.error('❌ Error starting billing:', billingError)
            }
          }
        }
        
        break
      }

      case 'track_unpublished': {
        // Track unpublished doesn't stop billing, but we log it
        console.log(`📊 Track unpublished for call ${callId}`)
        break
      }

      default:
        console.log(`ℹ️ Unhandled webhook event: ${event.event}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error processing LiveKit webhook:', error)
    
    // Return 200 to prevent LiveKit from retrying
    // (we'll handle errors internally)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 200 }
    )
  }
}

