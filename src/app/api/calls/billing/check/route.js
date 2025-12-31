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
 * POST /api/calls/billing/check
 * 
 * Recovery endpoint: Check if billing should start for a call
 * 
 * This is called periodically by the frontend as a fallback
 * in case webhooks or events are missed
 * 
 * IMPORTANT: This has idempotency built in - safe to call multiple times
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { callId } = body

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Checking if billing should start for call ${callId} (recovery check)`)

    // Check if billing can start
    const billingCheck = await CallStateMachine.canStartBilling(callId)
    
    if (!billingCheck.canStart) {
      console.log(`⏳ Billing cannot start for call ${callId}: ${billingCheck.reason}`)
      return NextResponse.json({
        success: true,
        billingStarted: false,
        reason: billingCheck.reason,
        callState: {
          userJoined: billingCheck.callData?.userJoined,
          astrologerJoined: billingCheck.callData?.astrologerJoined,
          audioTrackPublished: billingCheck.callData?.audioTrackPublished,
          status: billingCheck.callData?.status,
          billingStarted: billingCheck.callData?.billingStarted
        }
      })
    }

    // Try to start billing
    try {
      console.log(`🚀 Attempting to start billing for call ${callId}`)
      const billingResult = await PerSecondBillingService.startBilling(callId)
      
      console.log(`✅ Billing started for call ${callId} (via recovery check)`)
      
      return NextResponse.json({
        success: true,
        billingStarted: true,
        alreadyStarted: billingResult.alreadyStarted,
        ratePerSecond: billingResult.ratePerSecond,
        ratePerMinute: billingResult.ratePerMinute
      })
    } catch (billingError) {
      console.error(`❌ Error starting billing for call ${callId}:`, billingError.message)
      
      return NextResponse.json({
        success: false,
        billingStarted: false,
        error: 'Failed to start billing',
        details: billingError.message
      })
    }
  } catch (error) {
    console.error('Error in billing check endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

