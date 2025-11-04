import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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

const db = getFirestore()

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const astrologerId = searchParams.get('astrologerId')

    if (!userId && !astrologerId) {
      return NextResponse.json({ success: false, message: 'userId or astrologerId is required' }, { status: 400 })
    }

    // Query the correct 'calls' collection
    let query = db.collection('calls')
    if (userId) {
      query = query.where('userId', '==', userId)
    }
    if (astrologerId) {
      query = query.where('astrologerId', '==', astrologerId)
    }

    const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get()
    const history = []
    
    for (const doc of snapshot.docs) {
      const callData = doc.data()
      
      // Fetch astrologer name from astrologers collection
      let astrologerName = 'Unknown'
      if (callData.astrologerId) {
        try {
          const astrologerDoc = await db.collection('astrologers').doc(callData.astrologerId).get()
          if (astrologerDoc.exists) {
            const astrologerData = astrologerDoc.data()
            astrologerName = astrologerData.name || 'Unknown'
          }
        } catch (error) {
          console.error('Error fetching astrologer data:', error)
        }
      }
      
      // Try to fetch billing data for this call
      let cost = 0
      let duration = 0
      let finalAmount = 0
      
      try {
        const billingDoc = await db.collection('call_billing').doc(doc.id).get()
        if (billingDoc.exists) {
          const billingData = billingDoc.data()
          cost = billingData.finalAmount || billingData.totalCost || 0
          duration = billingData.durationMinutes || 0
          finalAmount = billingData.finalAmount || 0
        }
      } catch (error) {
        console.error('Error fetching billing data for call:', doc.id, error)
      }
      
      // If no billing data found, estimate cost based on call status and type
      if (cost === 0 && (callData.status === 'active' || callData.status === 'completed')) {
        // Default cost estimation for demonstration (should be fetched from pricing)
        cost = callData.callType === 'video' ? 100 : 50 // Default costs
        duration = 10 // Default duration for demonstration
      }
      
      // Ensure proper data types and formatting
      let startedAt = callData.createdAt
      if (typeof startedAt === 'string') {
        startedAt = new Date(startedAt)
      } else if (startedAt && startedAt.toDate) {
        // Firebase Timestamp
        startedAt = startedAt.toDate()
      } else if (!startedAt) {
        startedAt = new Date()
      }
      
      // Ensure cost and duration are numbers
      const finalCost = typeof cost === 'number' ? cost : parseFloat(cost) || 0
      const finalDuration = typeof duration === 'number' ? duration : parseInt(duration) || 0
      
      const formattedCall = {
        id: doc.id,
        astrologerName: astrologerName,
        astrologerId: callData.astrologerId,
        type: callData.callType || 'voice',
        startedAt: startedAt.toISOString(), // Ensure it's a valid date string
        cost: finalCost,
        duration: finalDuration,
        status: callData.status || 'completed'
      }
      
      history.push(formattedCall)
    }
    
    console.log('Call history fetched successfully:', {
      totalCalls: history.length,
      calls: history.map(call => ({
        id: call.id,
        astrologerName: call.astrologerName,
        cost: call.cost,
        duration: call.duration,
        startedAt: call.startedAt
      }))
    })
    
    return NextResponse.json({ success: true, history })
  } catch (error) {
    console.error('Error fetching call history:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 })
  }
}
