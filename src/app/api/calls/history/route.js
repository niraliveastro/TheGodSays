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
    
    // Fetch MORE than needed to account for filtering out failed calls
    const fetchLimit = Math.max(limit * 3, 20) // Fetch 3x or at least 20
    
    // Try the query with orderBy first, if it fails, fallback to without orderBy
    let snapshot
    try {
      snapshot = await query.orderBy('createdAt', 'desc').limit(fetchLimit).get()
      console.log(`📞 Fetched ${snapshot.size} calls with orderBy for ${userId ? 'user' : 'astrologer'}`)
    } catch (indexError) {
      console.log('Index not ready, querying without orderBy:', indexError.message)
      snapshot = await query.limit(fetchLimit).get()
    }
    const history = []
    const callIds = snapshot.docs.map(doc => doc.id)
    let callDocs = snapshot.docs
    
    // Sort in memory by createdAt (most recent first)
    callDocs = callDocs.sort((a, b) => {
      const aTime = a.data().createdAt?.toDate?.() || new Date(a.data().createdAt || 0)
      const bTime = b.data().createdAt?.toDate?.() || new Date(b.data().createdAt || 0)
      return bTime - aTime
    })
    
    // Collect unique user and astrologer IDs
    const userIdsSet = new Set()
    const astrologerIdsSet = new Set()
    callDocs.forEach(doc => {
      const data = doc.data()
      if (data.userId) userIdsSet.add(data.userId)
      if (data.astrologerId) astrologerIdsSet.add(data.astrologerId)
    })
    
    // Batch fetch users and astrologers in parallel (NO MORE call_billing collection)
    const [userDocs, astrologerDocs] = await Promise.all([
      userIdsSet.size > 0 ? Promise.all(Array.from(userIdsSet).map(id => db.collection('users').doc(id).get())) : Promise.resolve([]),
      astrologerIdsSet.size > 0 ? Promise.all(Array.from(astrologerIdsSet).map(id => db.collection('astrologers').doc(id).get())) : Promise.resolve([])
    ])
    
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
      
      // CRITICAL FIX: Read cost and duration DIRECTLY from call document (NEW system)
      // NO MORE call_billing collection lookup
      let cost = callData.finalAmount || 0
      let durationSeconds = callData.actualDurationSeconds || 0
      let duration = Math.floor(durationSeconds / 60) // Convert seconds to minutes for display
      
      // FILTER OUT: Skip failed calls or calls with no cost/duration
      // Only show successfully completed calls
      if (callData.status === 'failed' || (cost === 0 && durationSeconds === 0 && callData.status !== 'created')) {
        console.log(`⏭️ Skipping ${callData.status} call ${doc.id} with cost=₹${cost}, duration=${durationSeconds}s`)
        continue // Skip this call
      }
      
      // Debug logging for calls with 0 cost but completed status
      if (cost === 0 && callData.status === 'completed') {
        console.warn(`⚠️ Call ${doc.id} has 0 cost but status is completed:`, {
          finalAmount: callData.finalAmount,
          actualDurationSeconds: callData.actualDurationSeconds,
          status: callData.status,
          billingFinalized: callData.billingFinalized
        })
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
      
      // Stop after we have enough valid calls
      if (history.length >= limit) {
        break
      }
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
