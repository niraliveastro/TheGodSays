import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { BillingService } from '@/lib/billing'

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

    const { action, astrologerId, callId, userId, status, callType = 'video', durationMinutes } = await request.json()

    // Validate action
    const validActions = ['create-call', 'update-call-status', 'finalize-call', 'get-queue', 'get-astrologer-calls']
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

        const callData = {
          astrologerId,
          userId,
          status: isAstrologerAvailable ? 'pending' : 'queued',
          callType,
          createdAt: new Date().toISOString(),
          roomName: null,
          position: null
        }

        const callRef = await db.collection('calls').add(callData)

        return NextResponse.json({ success: true, call: { id: callRef.id, ...callData } })

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
        
        // Handle call completion and billing finalization
        if (status === 'completed' && durationMinutes !== undefined) {
          try {
            console.log(`Finalizing billing for call ${callId} with duration ${durationMinutes} minutes`)
            const billingResult = await BillingService.immediateCallSettlement(callId, durationMinutes)
            console.log('Billing finalization result:', billingResult)
            updateData.billingFinalized = true
            updateData.finalAmount = billingResult.finalAmount
            updateData.refundAmount = billingResult.refundAmount
            updateData.endTime = new Date()
            updateData.durationMinutes = durationMinutes // Store duration in call document
            
            // Update astrologer status back to online
            const callDoc = await callToUpdateRef.get()
            if (callDoc.exists) {
              const callData = callDoc.data()
              if (callData.astrologerId) {
                const astrologerRef = db.collection('astrologers').doc(callData.astrologerId)
                await astrologerRef.update({ status: 'online' })
                console.log(`Updated astrologer ${callData.astrologerId} status to online`)
              }
            }
          } catch (billingError) {
            console.error('Error finalizing billing:', billingError)
            updateData.billingError = billingError.message
          }
        } else if (status === 'completed' && durationMinutes === undefined) {
          // Handle completed calls without duration (shouldn't happen normally, but just in case)
          console.warn(`Call ${callId} marked as completed without durationMinutes`)
          updateData.endTime = new Date()
        }

        await callToUpdateRef.update(updateData)

        return NextResponse.json({ success: true, call: { id: callId, ...callToUpdateDoc.data(), ...updateData } })

      case 'finalize-call':
        if (!callId || durationMinutes === undefined) {
          return NextResponse.json({ error: 'Call ID and duration minutes are required' }, { status: 400 })
        }

        try {
          console.log(`Finalizing call ${callId} with duration ${durationMinutes} minutes`)
          
          // Finalize billing first
          const billingResult = await BillingService.immediateCallSettlement(callId, durationMinutes)
          console.log('Billing finalization result:', billingResult)
          
          // Update call status to completed
          const callFinalizeRef = db.collection('calls').doc(callId)
          const callDoc = await callFinalizeRef.get()
          
          await callFinalizeRef.update({
            status: 'completed',
            endTime: new Date(),
            durationMinutes,
            billingFinalized: true,
            finalAmount: billingResult.finalAmount,
            refundAmount: billingResult.refundAmount
          })
          
          // Update astrologer status back to online
          if (callDoc.exists) {
            const callData = callDoc.data()
            if (callData.astrologerId) {
              const astrologerRef = db.collection('astrologers').doc(callData.astrologerId)
              await astrologerRef.update({ status: 'online' })
              console.log(`Updated astrologer ${callData.astrologerId} status to online`)
            }
          }
          
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