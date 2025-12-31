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
 * GET /api/calls/diagnose?callId=xxx
 * 
 * Diagnostic endpoint to check call state and why billing might not be starting
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      )
    }

    const db = getFirestoreDB()
    const callRef = db.collection('calls').doc(callId)
    const callDoc = await callRef.get()

    if (!callDoc.exists) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      )
    }

    const callData = callDoc.data()

    // Check if billing can start
    const canStart = await CallStateMachine.canStartBilling(callId)
    
    // Get billing state
    const billingState = PerSecondBillingService.getBillingState(callId)

    // Build diagnostic report
    const diagnosis = {
      callId,
      currentState: {
        status: callData.status,
        userJoined: callData.userJoined || false,
        astrologerJoined: callData.astrologerJoined || false,
        audioTrackPublished: callData.audioTrackPublished || false,
        billingStarted: callData.billingStarted || false,
        billingFinalized: callData.billingFinalized || false,
        actualDurationSeconds: callData.actualDurationSeconds || 0,
        finalAmount: callData.finalAmount || 0,
      },
      canStartBilling: {
        canStart: canStart.canStart,
        reason: canStart.reason,
        requirements: {
          userJoined: callData.userJoined === true,
          astrologerJoined: callData.astrologerJoined === true,
          audioTrackPublished: callData.audioTrackPublished === true,
          statusConnected: callData.status === 'connected',
          billingNotStarted: callData.billingStarted !== true,
        }
      },
      billingState: billingState ? {
        durationSeconds: billingState.durationSeconds,
        totalDeducted: billingState.totalDeducted,
        totalEarning: billingState.totalEarning,
        isRunning: true
      } : {
        isRunning: false,
        message: 'Billing ticker not running'
      },
      recommendations: []
    }

    // Add recommendations
    if (!callData.userJoined) {
      diagnosis.recommendations.push('User has not joined. Frontend should call /api/calls/participant with action: "join", participantType: "user"')
    }
    if (!callData.astrologerJoined) {
      diagnosis.recommendations.push('Astrologer has not joined. Frontend should call /api/calls/participant with action: "join", participantType: "astrologer"')
    }
    if (!callData.audioTrackPublished) {
      diagnosis.recommendations.push('Audio track not published. Frontend should call /api/calls/media with trackType: "audio", event: "published"')
    }
    if (callData.status !== 'connected' && callData.status !== 'billing_active') {
      diagnosis.recommendations.push(`Call status is "${callData.status}" but should be "connected" or "billing_active"`)
    }
    if (callData.billingStarted && !billingState) {
      diagnosis.recommendations.push('Billing marked as started but ticker not running. Server may have restarted.')
    }

    return NextResponse.json({
      success: true,
      diagnosis
    })
  } catch (error) {
    console.error('Error diagnosing call:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

