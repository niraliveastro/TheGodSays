import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
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
 * POST /api/calls/billing/final
 * Finalize billing for a call
 * 
 * This is idempotent - can be called multiple times safely
 * 
 * NOTE: This endpoint should be called by:
 * - Participant disconnect handler
 * - Manual call end
 * - Insufficient balance handler
 * - NOT by frontend directly (use LiveKit webhooks)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { callId, reason = 'call_ended' } = body

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      )
    }

    // Finalize billing (idempotent)
    const result = await PerSecondBillingService.finalizeBilling(callId, reason)

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Error finalizing billing:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

