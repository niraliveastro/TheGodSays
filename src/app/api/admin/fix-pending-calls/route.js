import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

/**
 * POST /api/admin/fix-pending-calls
 * Fix pending calls that have timed out - mark them as cancelled
 */
export async function POST(request) {
  try {
    const db = getFirestore()
    
    // Get all pending calls
    const pendingCallsSnapshot = await db.collection('calls')
      .where('status', '==', 'pending')
      .get()
    
    const now = new Date()
    const timeoutMinutes = 2 // Calls timeout after 2 minutes if not accepted
    let fixedCount = 0
    
    const batch = db.batch()
    let batchCount = 0
    const maxBatchSize = 500
    
    for (const doc of pendingCallsSnapshot.docs) {
      const callData = doc.data()
      const createdAt = callData.createdAt
      
      let callDate
      if (typeof createdAt === 'string') {
        callDate = new Date(createdAt)
      } else if (createdAt && createdAt.toDate) {
        callDate = createdAt.toDate()
      } else {
        continue
      }
      
      // Check if call has timed out (more than 2 minutes old)
      const minutesSinceCreation = (now - callDate) / (1000 * 60)
      
      if (minutesSinceCreation > timeoutMinutes) {
        const callRef = db.collection('calls').doc(doc.id)
        batch.update(callRef, {
          status: 'cancelled',
          endTime: now.toISOString(),
          cancelledAt: now.toISOString(),
          updatedAt: now.toISOString(),
          timeoutReason: 'auto-cancelled-due-to-timeout'
        })
        
        // Also cancel billing if exists
        const billingRef = db.collection('call_billing').doc(doc.id)
        const billingDoc = await billingRef.get()
        if (billingDoc.exists) {
          batch.update(billingRef, {
            status: 'cancelled',
            endTime: now.toISOString(),
            updatedAt: now.toISOString()
          })
        }
        
        // Update astrologer status if needed
        if (callData.astrologerId) {
          const astrologerRef = db.collection('astrologers').doc(callData.astrologerId)
          const astrologerDoc = await astrologerRef.get()
          if (astrologerDoc.exists && astrologerDoc.data().status === 'busy') {
            batch.update(astrologerRef, { status: 'online' })
          }
        }
        
        fixedCount++
        batchCount++
        
        // Commit batch if it reaches max size
        if (batchCount >= maxBatchSize) {
          await batch.commit()
          batchCount = 0
        }
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit()
    }
    
    return NextResponse.json({
      success: true,
      fixedCount,
      message: `Fixed ${fixedCount} pending calls that timed out`
    })
  } catch (error) {
    console.error('Error fixing pending calls:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
