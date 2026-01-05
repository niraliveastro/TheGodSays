import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
// OLD BILLING SYSTEM - DEPRECATED
// import { BillingService } from '@/lib/billing'
import { CallStateService } from '@/lib/callState'
import { CallStateMachine } from '@/lib/callStateMachine'
import { PerSecondBillingService } from '@/lib/perSecondBilling'

// Prevent static generation - this is a dynamic API route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Lazy Firebase initialization function
function getFirestoreDB() {
  // Initialize Firebase Admin if not already initialized
  if (!getApps().length) {
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase environment variables are not set');
      }

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        })
      });
    } catch (error) {
      console.error('Firebase Admin initialization failed:', error.message);
      throw error;
    }
  }

  return getFirestore();
}

export async function POST(request) {
  try {
    // Initialize Firebase only when the route is called
    const db = getFirestoreDB();

    // Safely parse JSON with error handling
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body', 
        details: parseError.message 
      }, { status: 400 });
    }

    const { action, astrologerId, callId, userId, status, callType = 'video', durationMinutes } = body;

    // Validate action
    const validActions = [
      'create-call', 
      'update-call-status', 
      'finalize-call', 
      'get-queue', 
      'get-astrologer-calls',
      'mark-connected',
      'get-duration',
      'complete-call',
      'check-connection'
    ]
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Validate IDs format
    if (astrologerId && (typeof astrologerId !== 'string' || astrologerId.length > 100)) {
      return NextResponse.json({ error: 'Invalid astrologer ID' }, { status: 400 })
    }
    if (userId && (typeof userId !== 'string' || userId.length > 100)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }
    if (callId && (typeof callId !== 'string' || callId.length > 100)) {
      return NextResponse.json({ error: 'Invalid call ID' }, { status: 400 })
    }
    if (callType && !['video', 'voice'].includes(callType)) {
      return NextResponse.json({ error: 'Invalid call type' }, { status: 400 })
    }

    switch (action) {
      case 'create-call':
        const astrologerRef = db.collection('astrologers').doc(astrologerId)
        const astrologerDoc = await astrologerRef.get()
        if (!astrologerDoc.exists) {
          return NextResponse.json({ error: 'Astrologer not found' }, { status: 404 })
        }

        const isAstrologerAvailable = astrologerDoc.data().status === 'online'

        // Generate call ID (use newCallId to avoid shadowing the callId from body destructuring)
        const newCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // CRITICAL: Use CallStateMachine to create call with new schema
        // This ensures all required fields are present from the start
        const result = await CallStateMachine.createCall(newCallId, userId, astrologerId, callType)
        
        // Update call with additional metadata (status, roomName, position)
        const callRef = db.collection('calls').doc(newCallId)
        await callRef.update({
          status: isAstrologerAvailable ? 'pending' : 'queued',
          roomName: null,
          position: null
        })

        return NextResponse.json({ 
          success: true, 
          call: { 
            id: newCallId, 
            ...result.call,
            status: isAstrologerAvailable ? 'pending' : 'queued'
          } 
        })

      case 'update-call-status':
        // Validate callId is provided and valid
        if (!callId || typeof callId !== 'string' || callId.length === 0) {
          return NextResponse.json({ error: 'Valid callId is required' }, { status: 400 })
        }

        const callToUpdateRef = db.collection('calls').doc(callId)
        const callToUpdateDoc = await callToUpdateRef.get()

        if (!callToUpdateDoc.exists) {
          return NextResponse.json({ error: 'Call not found' }, { status: 404 })
        }

        const currentCallData = callToUpdateDoc.data()
        
        // CRITICAL: Migrate old calls to new schema if needed
        const needsMigration = currentCallData.userJoined === undefined || 
                              currentCallData.astrologerJoined === undefined ||
                              currentCallData.audioTrackPublished === undefined ||
                              currentCallData.billingStarted === undefined
        
        if (needsMigration) {
          console.log(`🔄 Migrating call ${callId} to new schema (in update-call-status)`)
          const migrationData = {
            userJoined: currentCallData.userJoined || false,
            astrologerJoined: currentCallData.astrologerJoined || false,
            audioTrackPublished: currentCallData.audioTrackPublished || false,
            billingStarted: currentCallData.billingStarted || false,
            billingFinalized: currentCallData.billingFinalized || false,
            callStartTime: currentCallData.callStartTime || null,
            callEndTime: currentCallData.callEndTime || null,
            ratePerMinute: currentCallData.ratePerMinute || null,
            ratePerSecond: currentCallData.ratePerSecond || null,
            holdAmount: currentCallData.holdAmount || null,
            actualDurationSeconds: currentCallData.actualDurationSeconds || 0,
            finalAmount: currentCallData.finalAmount || 0,
            astrologerEarning: currentCallData.astrologerEarning || 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }
          await callToUpdateRef.update(migrationData)
          // Refresh call data after migration
          const migratedDoc = await callToUpdateRef.get()
          Object.assign(currentCallData, migratedDoc.data())
        }
        
        // CRITICAL: Prevent accepting cancelled or rejected calls
        if (status === 'active') {
          if (currentCallData.status === 'cancelled') {
            return NextResponse.json({ 
              error: 'Call was cancelled by user',
              success: false,
              callStatus: 'cancelled'
            }, { status: 400 })
          }
          
          if (currentCallData.status === 'rejected') {
            return NextResponse.json({ 
              error: 'Call was already rejected',
              success: false,
              callStatus: 'rejected'
            }, { status: 400 })
          }
          
          if (currentCallData.status === 'completed') {
            return NextResponse.json({ 
              error: 'Call was already completed',
              success: false,
              callStatus: 'completed'
            }, { status: 400 })
          }
          
          if (currentCallData.status !== 'pending') {
            return NextResponse.json({ 
              error: 'Call is not available for acceptance',
              success: false,
              callStatus: currentCallData.status
            }, { status: 400 })
          }
        }

        const updateData = { status }
        if (status === 'active') {
          // Create a unique room name based on call type
          const callType = currentCallData.callType || 'video'
          updateData.roomName = `astro-${astrologerId}-${userId}-${Date.now()}-${callType}`
          updateData.acceptedAt = new Date().toISOString()
          console.log('Creating room for call:', {
            callId,
            callType,
            roomName: updateData.roomName
          })
          
          // Also update the call document with roomName for webhook lookup
          await callToUpdateRef.update({ roomName: updateData.roomName })
        } else if (status === 'cancelled' || status === 'rejected') {
          // Handle call cancellation/rejection
          const now = new Date()
          updateData.endTime = now.toISOString()
          updateData.cancelledAt = now.toISOString()
          updateData.updatedAt = now.toISOString()
          
          // Update astrologer status back to online if they were busy
          const callData = currentCallData
          if (callData.astrologerId) {
            const astrologerRef = db.collection('astrologers').doc(callData.astrologerId)
            const astrologerDoc = await astrologerRef.get()
            if (astrologerDoc.exists && astrologerDoc.data().status === 'busy') {
              await astrologerRef.update({ status: 'online' })
              console.log(`Updated astrologer ${callData.astrologerId} status to online after call ${status}`)
            }
          }
        }
        
        // Handle call completion
        // NOTE: Billing finalization happens automatically via PerSecondBillingService
        // when participants leave (see /api/calls/participant route)
        if (status === 'completed') {
          updateData.endTime = new Date()
          console.log(`Call ${callId} marked as completed. Billing handled by PerSecondBillingService.`)
        }

        await callToUpdateRef.update(updateData)

        return NextResponse.json({ success: true, call: { id: callId, ...callToUpdateDoc.data(), ...updateData } })

      case 'finalize-call':
        if (!callId) {
          return NextResponse.json({ error: 'Call ID is required' }, { status: 400 })
        }

        try {
          console.log(`Finalizing call ${callId} via new per-second billing system`)
          
          // Use the new per-second billing service
          const billingResult = await PerSecondBillingService.finalizeBilling(callId, 'manual_finalize')
          console.log('Billing finalization result:', billingResult)
          
          return NextResponse.json({ 
            success: true, 
            message: 'Call finalized successfully',
            billing: billingResult
          })
        } catch (error) {
          console.error('Error finalizing call:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'get-queue':
        const queueSnapshot = await db.collection('calls').where('astrologerId', '==', astrologerId).where('status', '==', 'queued').orderBy('createdAt').get()
        const queueCalls = queueSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        return NextResponse.json({ success: true, queue: queueCalls })

      case 'get-astrologer-calls':
        const astrologerCallsSnapshot = await db.collection('calls').where('astrologerId', '==', astrologerId).get()
        const astrologerCalls = astrologerCallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        return NextResponse.json({ success: true, calls: astrologerCalls })

      case 'mark-connected':
        if (!callId) {
          return NextResponse.json({ error: 'Call ID is required' }, { status: 400 })
        }
        try {
          const result = await CallStateService.markCallConnected(callId)
          
          // NOTE: Billing is NO LONGER initialized here!
          // The new per-second billing system starts automatically when:
          // 1. Both participants join (via /api/calls/participant)
          // 2. Audio track is published (via /api/calls/media)
          // This happens via LiveKit webhooks and frontend notifications
          // See: PerSecondBillingService.startBilling() in src/lib/perSecondBilling.js
          
          console.log(`✅ Call ${callId} marked as connected. Billing will start automatically when audio track is published.`)
          
          return NextResponse.json({ success: true, ...result })
        } catch (error) {
          console.error('Error marking call as connected:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'get-duration':
        if (!callId) {
          return NextResponse.json({ error: 'Call ID is required' }, { status: 400 })
        }
        try {
          const duration = await CallStateService.getCallDuration(callId)
          return NextResponse.json({ success: true, ...duration })
        } catch (error) {
          console.error('Error getting call duration:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'complete-call':
        if (!callId) {
          return NextResponse.json({ error: 'Call ID is required' }, { status: 400 })
        }
        try {
          console.log(`Completing call ${callId} via new per-second billing system`)
          
          // Use the new per-second billing service
          const billingResult = await PerSecondBillingService.finalizeBilling(callId, 'complete_call')
          
          return NextResponse.json({ 
            success: true, 
            billing: billingResult
          })
        } catch (error) {
          console.error('Error completing call:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'check-connection':
        if (!callId) {
          return NextResponse.json({ error: 'Call ID is required' }, { status: 400 })
        }
        try {
          const status = await CallStateService.checkConnectionStatus(callId)
          return NextResponse.json({ success: true, ...status })
        } catch (error) {
          console.error('Error checking connection status:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in calls API:', error)
    // Provide more detailed error information for debugging
    const errorMessage = error instanceof SyntaxError && error.message.includes('JSON')
      ? `JSON parsing error: ${error.message}`
      : error.message || 'Internal server error'
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    // Initialize Firebase only when the route is called
    const db = getFirestoreDB();

    const { searchParams } = new URL(request.url)
    const astrologerId = searchParams.get('astrologerId')

    // Validate astrologerId
    if (astrologerId && (typeof astrologerId !== 'string' || astrologerId.length > 100)) {
      return NextResponse.json({ error: 'Invalid astrologer ID' }, { status: 400 })
    }

    if (astrologerId) {
      const astrologerCallsSnapshot = await db.collection('calls')
        .where('astrologerId', '==', astrologerId)
        .limit(100)
        .get()
      const astrologerCalls = astrologerCallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      return NextResponse.json({ success: true, calls: astrologerCalls })
    }

    // Limit all calls query to prevent abuse
    const allCallsSnapshot = await db.collection('calls').limit(50).get()
    const allCalls = allCallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, calls: allCalls })
  } catch (error) {
    console.error('Error fetching calls:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}