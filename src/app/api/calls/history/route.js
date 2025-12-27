import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Mark this route as dynamic to prevent prerendering during build
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

export async function GET(request) {
  // Initialize db lazily to avoid build-time errors
  const db = getFirestore()
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

    // Get limit from query params, default to 5 for faster loading
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 5
    
    // Try the query with orderBy first, if it fails, fallback to without orderBy
    let snapshot
    try {
      snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get()
    } catch (indexError) {
      console.log('Index not ready, querying without orderBy:', indexError.message)
      snapshot = await query.limit(limit).get()
    }
    const history = []
    const callIds = snapshot.docs.map(doc => doc.id)
    const callDocs = snapshot.docs
    
    // Collect unique user and astrologer IDs
    const userIdsSet = new Set()
    const astrologerIdsSet = new Set()
    callDocs.forEach(doc => {
      const data = doc.data()
      if (data.userId) userIdsSet.add(data.userId)
      if (data.astrologerId) astrologerIdsSet.add(data.astrologerId)
    })
    
    // Batch fetch all billing records, users, and astrologers in parallel
    const [billingResults, userDocs, astrologerDocs] = await Promise.all([
      callIds.length > 0 ? Promise.all(callIds.map(id => db.collection('call_billing').doc(id).get())) : Promise.resolve([]),
      userIdsSet.size > 0 ? Promise.all(Array.from(userIdsSet).map(id => db.collection('users').doc(id).get())) : Promise.resolve([]),
      astrologerIdsSet.size > 0 ? Promise.all(Array.from(astrologerIdsSet).map(id => db.collection('astrologers').doc(id).get())) : Promise.resolve([])
    ])
    
    // Create billing map for quick lookup
    const billingMap = new Map()
    billingResults.forEach((billingDoc, idx) => {
      if (billingDoc.exists) {
        const billingData = billingDoc.data()
        billingMap.set(callIds[idx], {
          cost: billingData.finalAmount || billingData.totalCost || 0,
          duration: billingData.durationMinutes || 0
        })
      }
    })
    
    const usersMap = new Map()
    userDocs.forEach(doc => {
      if (doc.exists) {
        const userData = doc.data()
        usersMap.set(doc.id, userData.name || userData.displayName || userData.email || userData.fullName || `User ${doc.id.substring(0, 8)}`)
      }
    })
    
    const astrologersMap = new Map()
    astrologerDocs.forEach(doc => {
      if (doc.exists) {
        const astrologerData = doc.data()
        astrologersMap.set(doc.id, astrologerData.name || 'Unknown')
      }
    })
    
    // Build history array with pre-fetched data
    for (const doc of callDocs) {
      const callData = doc.data()
      
      // Get user and astrologer names from maps
      const userName = callData.userId ? (usersMap.get(callData.userId) || `User ${callData.userId.substring(0, 8)}`) : 'Anonymous User'
      const astrologerName = callData.astrologerId ? (astrologersMap.get(callData.astrologerId) || 'Unknown') : 'Unknown'
      
      // Get cost and duration from billing map (prefer billing data, fallback to call data)
      const billingData = billingMap.get(doc.id)
      let cost = 0
      let duration = 0
      
      if (billingData) {
        cost = billingData.cost || 0
        duration = billingData.duration || 0
      } else {
        // Fallback to call data if billing not found
        cost = callData.finalAmount || 0
        duration = callData.durationMinutes || 0
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
        userName: userName,
        userId: callData.userId,
        type: callData.callType || 'voice',
        startedAt: startedAt.toISOString(),
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
