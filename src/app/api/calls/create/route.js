import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { CallStateMachine } from '@/lib/callStateMachine'

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
 * POST /api/calls/create
 * Create a new call
 */
export async function POST(request) {
  try {
    const db = getFirestoreDB()
    const body = await request.json()
    const { astrologerId, userId, callType = 'video' } = body

    // Validate inputs
    if (!astrologerId || !userId) {
      return NextResponse.json(
        { error: 'Astrologer ID and User ID are required' },
        { status: 400 }
      )
    }

    // Verify astrologer exists
    const astrologerRef = db.collection('astrologers').doc(astrologerId)
    const astrologerDoc = await astrologerRef.get()
    
    if (!astrologerDoc.exists) {
      return NextResponse.json(
        { error: 'Astrologer not found' },
        { status: 404 }
      )
    }

    const isAstrologerAvailable = astrologerDoc.data().status === 'online'

    // Generate call ID
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create call using state machine (creates with status 'created')
    const result = await CallStateMachine.createCall(callId, userId, astrologerId, callType)

    // Update call with additional metadata
    // NOTE: Status will transition to 'connected' when both participants join
    const callRef = db.collection('calls').doc(callId)
    await callRef.update({
      status: isAstrologerAvailable ? 'pending' : 'queued',
      roomName: null,
      position: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    console.log(`📞 Call ${callId} created with status: ${isAstrologerAvailable ? 'pending' : 'queued'}`)

    return NextResponse.json({
      success: true,
      call: {
        id: callId,
        ...result.call,
        status: isAstrologerAvailable ? 'pending' : 'queued'
      }
    })
  } catch (error) {
    console.error('Error creating call:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

