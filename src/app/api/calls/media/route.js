import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { CallStateMachine } from '@/lib/callStateMachine'
import { PerSecondBillingService } from '@/lib/perSecondBilling'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getFirestoreDB() {
  if (!getApps().length) {
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      const privateKey = process.env.FIREBASE_PRIVATE_KEY

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase environment variables are not set')
      }

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        })
      })
    } catch (error) {
      console.error('Firebase Admin initialization failed:', error.message)
      throw error
    }
  }

  return getFirestore()
}

/**
 * POST /api/calls/media
 * Handle media track events (audio/video published/unpublished)
 * 
 * This is critical: Billing starts ONLY when audio track is published
 * AND both participants are joined
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { callId, trackType, event } = body

    // Validate inputs
    if (!callId || !trackType || !event) {
      return NextResponse.json(
        { error: 'Call ID, track type, and event are required' },
        { status: 400 }
      )
    }

    if (!['audio', 'video'].includes(trackType)) {
      return NextResponse.json(
        { error: 'Invalid track type. Must be "audio" or "video"' },
        { status: 400 }
      )
    }

    if (!['published', 'unpublished'].includes(event)) {
      return NextResponse.json(
        { error: 'Invalid event. Must be "published" or "unpublished"' },
        { status: 400 }
      )
    }

    // Only audio track published triggers billing start
    if (trackType === 'audio' && event === 'published') {
      console.log(`📢 Audio track published event received for call ${callId}`)
      
      // Mark audio track as published
      const result = await CallStateMachine.markAudioTrackPublished(callId)
      console.log(`📊 Audio track published result for call ${callId}:`, {
        canStartBilling: result.canStartBilling,
        status: result.status,
        reason: result.reason
      })
      
      // If billing can start, start it
      if (result.canStartBilling) {
        try {
          console.log(`🚀 Starting billing for call ${callId}...`)
          const billingResult = await PerSecondBillingService.startBilling(callId)
          console.log(`✅ Billing started successfully for call ${callId}:`, {
            ratePerSecond: billingResult.ratePerSecond,
            ratePerMinute: billingResult.ratePerMinute,
            alreadyStarted: billingResult.alreadyStarted
          })
          
          return NextResponse.json({
            success: true,
            audioTrackPublished: true,
            billingStarted: true,
            ratePerSecond: billingResult.ratePerSecond,
            ratePerMinute: billingResult.ratePerMinute
          })
        } catch (billingError) {
          console.error(`❌ Error starting billing for call ${callId}:`, {
            error: billingError.message,
            stack: billingError.stack
          })
          return NextResponse.json(
            { 
              error: 'Failed to start billing', 
              details: billingError.message,
              audioTrackPublished: true,
              billingStarted: false
            },
            { status: 500 }
          )
        }
      } else {
        console.log(`⚠️ Cannot start billing for call ${callId}. Reason: ${result.reason || 'Conditions not met'}`)
        console.log(`📋 Call state check:`, {
          userJoined: result.callData?.userJoined,
          astrologerJoined: result.callData?.astrologerJoined,
          audioTrackPublished: result.callData?.audioTrackPublished,
          status: result.callData?.status,
          billingStarted: result.callData?.billingStarted
        })
      }
      
      return NextResponse.json({
        success: true,
        audioTrackPublished: true,
        billingStarted: false,
        reason: result.reason || 'Waiting for all conditions to be met',
        canStartBilling: result.canStartBilling,
        callState: {
          userJoined: result.callData?.userJoined,
          astrologerJoined: result.callData?.astrologerJoined,
          audioTrackPublished: result.callData?.audioTrackPublished,
          status: result.callData?.status,
          billingStarted: result.callData?.billingStarted
        }
      })
    }
    
    // For other events, just acknowledge
    return NextResponse.json({
      success: true,
      message: 'Media event recorded'
    })
  } catch (error) {
    console.error('Error handling media event:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

