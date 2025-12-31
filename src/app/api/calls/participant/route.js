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
 * POST /api/calls/participant
 * Handle participant join/leave events
 * 
 * Actions:
 * - join: Mark participant as joined
 * - leave: Mark participant as left (may trigger finalization)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { callId, action, participantType } = body

    // Validate inputs
    if (!callId || !action || !participantType) {
      return NextResponse.json(
        { error: 'Call ID, action, and participant type are required' },
        { status: 400 }
      )
    }

    if (!['join', 'leave'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "join" or "leave"' },
        { status: 400 }
      )
    }

    if (!['user', 'astrologer'].includes(participantType)) {
      return NextResponse.json(
        { error: 'Invalid participant type. Must be "user" or "astrologer"' },
        { status: 400 }
      )
    }

    if (action === 'join') {
      // Mark participant as joined
      const result = await CallStateMachine.markParticipantJoined(callId, participantType)
      
      // CRITICAL: If both participants are now joined and audio track might exist, check if billing should start
      if (result.shouldCheckBilling) {
        try {
          console.log(`🔍 Both participants joined - checking if billing can start for call ${callId}`)
          const billingCheck = await CallStateMachine.canStartBilling(callId)
          
          if (billingCheck.canStart) {
            console.log(`🚀 Starting billing for call ${callId} (triggered by participant join)`)
            await PerSecondBillingService.startBilling(callId)
          } else {
            console.log(`⏳ Billing cannot start yet for call ${callId}: ${billingCheck.reason}`)
          }
        } catch (billingError) {
          console.error(`❌ Error checking/starting billing after participant join:`, billingError)
          // Don't fail the participant join if billing fails
        }
      }
      
      return NextResponse.json({
        success: true,
        bothJoined: result.bothJoined,
        status: result.status,
        shouldCheckBilling: result.shouldCheckBilling
      })
    } else if (action === 'leave') {
      // Mark participant as left
      const result = await CallStateMachine.markParticipantLeft(callId, participantType)
      
      // If billing should be finalized, do it
      if (result.shouldFinalize) {
        try {
          await PerSecondBillingService.finalizeBilling(callId, 'participant_left')
        } catch (finalizeError) {
          console.error('Error finalizing billing on participant leave:', finalizeError)
          // Continue - finalization will be retried
        }
      }
      
      return NextResponse.json({
        success: true,
        status: result.status,
        finalized: result.shouldFinalize
      })
    }
  } catch (error) {
    console.error('Error handling participant event:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

