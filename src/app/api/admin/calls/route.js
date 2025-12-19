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
 * GET /api/admin/calls
 * Get all call logs with user and astrologer details
 * Query params: limit, status, startDate, endDate
 */
export async function GET(request) {
  try {
    const db = getFirestore()
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build query
    let query = db.collection('calls')
    
    if (status) {
      query = query.where('status', '==', status)
    }
    
    if (startDate) {
      query = query.where('createdAt', '>=', startDate)
    }
    
    if (endDate) {
      query = query.where('createdAt', '<=', endDate)
    }

    // Try to order by createdAt, fallback if index not ready
    let snapshot
    try {
      snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get()
    } catch (indexError) {
      console.log('Index not ready, querying without orderBy:', indexError.message)
      snapshot = await query.limit(limit).get()
    }

    const calls = []
    const now = new Date()
    const timeoutMinutes = 2 // Calls timeout after 2 minutes
    const batch = db.batch()
    let batchCount = 0
    const maxBatchSize = 500
    
    // Collect all unique IDs for batch fetching
    const userIds = new Set()
    const astrologerIds = new Set()
    const callIds = []
    
    // First pass: collect IDs and fix pending calls
    for (const doc of snapshot.docs) {
      const callData = doc.data()
      callIds.push(doc.id)
      
      if (callData.userId) userIds.add(callData.userId)
      if (callData.astrologerId) astrologerIds.add(callData.astrologerId)
      
      // Auto-fix pending calls that timed out
      if (callData.status === 'pending') {
        const pendingCreatedAt = callData.createdAt
        let callDate
        if (typeof pendingCreatedAt === 'string') {
          callDate = new Date(pendingCreatedAt)
        } else if (pendingCreatedAt && pendingCreatedAt.toDate) {
          callDate = pendingCreatedAt.toDate()
        }
        
        if (callDate) {
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
            callData.status = 'cancelled'
            batchCount++
            
            if (batchCount >= maxBatchSize) {
              await batch.commit()
              batchCount = 0
            }
          }
        }
      }
    }
    
    // Commit any remaining batch updates
    if (batchCount > 0) {
      await batch.commit()
    }
    
    // Batch fetch all users, astrologers, and billing data in parallel
    const [userDocs, astrologerDocs, billingDocs] = await Promise.all([
      userIds.size > 0 ? Promise.all(Array.from(userIds).map(id => db.collection('users').doc(id).get())) : Promise.resolve([]),
      astrologerIds.size > 0 ? Promise.all(Array.from(astrologerIds).map(id => db.collection('astrologers').doc(id).get())) : Promise.resolve([]),
      callIds.length > 0 ? Promise.all(callIds.map(id => db.collection('call_billing').doc(id).get())) : Promise.resolve([]),
    ])
    
    // Create lookup maps
    const usersMap = new Map()
    userDocs.forEach(doc => {
      if (doc.exists) {
        const data = doc.data()
        usersMap.set(doc.id, {
          name: data.name || data.displayName || data.email || 'Unknown User',
          email: data.email || ''
        })
      }
    })
    
    const astrologersMap = new Map()
    astrologerDocs.forEach(doc => {
      if (doc.exists) {
        const data = doc.data()
        astrologersMap.set(doc.id, data.name || 'Unknown Astrologer')
      }
    })
    
    const billingMap = new Map()
    billingDocs.forEach((doc, idx) => {
      if (doc.exists) {
        const data = doc.data()
        billingMap.set(callIds[idx], {
          cost: data.finalAmount || data.totalCost || 0,
          duration: data.durationMinutes || 0,
          finalAmount: data.finalAmount || 0
        })
      }
    })
    
    // Second pass: build calls array with pre-fetched data
    for (const doc of snapshot.docs) {
      const callData = doc.data()
      
      // Get user details from map
      const userInfo = usersMap.get(callData.userId) || { name: 'Unknown User', email: '' }
      const userName = userInfo.name
      const userEmail = userInfo.email
      
      // Get astrologer details from map
      const astrologerName = astrologersMap.get(callData.astrologerId) || 'Unknown Astrologer'
      
      // Get billing details from map
      const billingInfo = billingMap.get(doc.id)
      let cost = 0
      let duration = 0
      let finalAmount = 0
      
      if (billingInfo) {
        cost = billingInfo.cost
        duration = billingInfo.duration
        finalAmount = billingInfo.finalAmount
      } else {
        // Fallback to call data
        duration = callData.durationMinutes || 0
        finalAmount = callData.finalAmount || 0
        cost = finalAmount
      }
      
      // Format dates
      let createdAt = callData.createdAt
      if (createdAt && typeof createdAt === 'string') {
        createdAt = new Date(createdAt)
      } else if (createdAt && createdAt.toDate) {
        createdAt = createdAt.toDate()
      }
      
      let endTime = callData.endTime
      if (endTime && typeof endTime === 'string') {
        endTime = new Date(endTime)
      } else if (endTime && endTime.toDate) {
        endTime = endTime.toDate()
      }

      calls.push({
        id: doc.id,
        userId: callData.userId,
        userName,
        userEmail,
        astrologerId: callData.astrologerId,
        astrologerName,
        callType: callData.callType || 'voice',
        status: callData.status || 'unknown',
        createdAt: createdAt ? createdAt.toISOString() : null,
        endTime: endTime ? endTime.toISOString() : null,
        durationMinutes: duration,
        cost: finalAmount || cost,
        roomName: callData.roomName,
        acceptedAt: callData.acceptedAt,
      })
    }

    return NextResponse.json({ success: true, calls, total: calls.length })
  } catch (error) {
    console.error('Error fetching admin calls:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

