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
 * Helper function to convert Firebase Timestamp to Date
 */
function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') return new Date(value)
  if (value && typeof value.toDate === 'function') return value.toDate()
  return null
}

/**
 * GET /api/admin/stats
 * Get dashboard statistics: total calls, revenue, active users, etc.
 * UPDATED: Now uses calls collection directly (finalAmount, actualDurationSeconds)
 */
export async function GET(request) {
  try {
    const db = getFirestore()
    
    // Get all calls
    const callsSnapshot = await db.collection('calls').get()
    const allCalls = callsSnapshot.docs.map(doc => {
      const data = doc.data()
      return { 
        id: doc.id, 
        ...data,
        // Normalize date fields
        createdAt: toDate(data.createdAt),
        endTime: toDate(data.endTime),
      }
    })
    
    // Calculate statistics
    const totalCalls = allCalls.length
    const completedCalls = allCalls.filter(c => c.status === 'completed')
    const activeCalls = allCalls.filter(c => c.status === 'active').length
    const pendingCalls = allCalls.filter(c => c.status === 'pending').length
    const cancelledCalls = allCalls.filter(c => c.status === 'cancelled').length
    
    // Calculate total revenue from completed calls (using finalAmount from calls collection)
    const totalRevenue = completedCalls.reduce((sum, c) => {
      const amount = typeof c.finalAmount === 'number' ? c.finalAmount : parseFloat(c.finalAmount) || 0
      return sum + amount
    }, 0)
    
    // Calculate total duration from completed calls (using actualDurationSeconds from calls collection)
    const totalDurationSeconds = completedCalls.reduce((sum, c) => {
      const seconds = typeof c.actualDurationSeconds === 'number' ? c.actualDurationSeconds : parseFloat(c.actualDurationSeconds) || 0
      return sum + seconds
    }, 0)
    const totalDuration = totalDurationSeconds / 60 // Convert to minutes
    
    // Get active users (users who have made at least one call)
    const uniqueUserIds = new Set(allCalls.map(c => c.userId).filter(Boolean))
    const activeUsers = uniqueUserIds.size
    
    // Get active astrologers (astrologers with status 'online')
    const activeAstrologersSnapshot = await db.collection('astrologers')
      .where('status', '==', 'online')
      .get()
    const activeAstrologers = activeAstrologersSnapshot.size
    
    // Calculate average call duration (in minutes)
    const avgDuration = completedCalls.length > 0 
      ? totalDuration / completedCalls.length 
      : 0
    
    // Calculate average call cost
    const avgCost = completedCalls.length > 0 
      ? totalRevenue / completedCalls.length 
      : 0
    
    // Get today's stats (using server local time)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    
    const todayCalls = allCalls.filter(c => {
      // Use endTime for completed calls, createdAt for others
      const dateToCheck = c.endTime || c.createdAt
      if (!dateToCheck) return false
      const callDate = dateToCheck instanceof Date ? dateToCheck : new Date(dateToCheck)
      return callDate >= today
    })
    
    const todayCompletedCalls = completedCalls.filter(c => {
      // For revenue, use endTime (when call was completed), fallback to createdAt
      const endDate = c.endTime || c.createdAt
      if (!endDate) return false
      const callDate = endDate instanceof Date ? endDate : new Date(endDate)
      return callDate >= today
    })
    
    const todayRevenue = todayCompletedCalls.reduce((sum, c) => {
      const amount = typeof c.finalAmount === 'number' ? c.finalAmount : parseFloat(c.finalAmount) || 0
      return sum + amount
    }, 0)
    
    // Get this month's stats (using server local time)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    
    const monthCalls = allCalls.filter(c => {
      // Use endTime for completed calls, createdAt for others
      const dateToCheck = c.endTime || c.createdAt
      if (!dateToCheck) return false
      const callDate = dateToCheck instanceof Date ? dateToCheck : new Date(dateToCheck)
      return callDate >= monthStart
    })
    
    const monthCompletedCalls = completedCalls.filter(c => {
      // For revenue, use endTime (when call was completed), fallback to createdAt
      const endDate = c.endTime || c.createdAt
      if (!endDate) return false
      const callDate = endDate instanceof Date ? endDate : new Date(endDate)
      return callDate >= monthStart
    })
    
    const monthRevenue = monthCompletedCalls.reduce((sum, c) => {
      const amount = typeof c.finalAmount === 'number' ? c.finalAmount : parseFloat(c.finalAmount) || 0
      return sum + amount
    }, 0)

    return NextResponse.json({
      success: true,
      stats: {
        totalCalls,
        completedCalls: completedCalls.length,
        activeCalls,
        pendingCalls,
        cancelledCalls,
        totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
        totalDuration: Math.round(totalDuration * 100) / 100,
        avgDuration: Math.round(avgDuration * 100) / 100,
        avgCost: Math.round(avgCost * 100) / 100,
        uniqueUsers: activeUsers,
        uniqueAstrologers: activeAstrologers,
        todayCalls: todayCalls.length,
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        monthCalls: monthCalls.length,
        monthRevenue: Math.round(monthRevenue * 100) / 100,
      }
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
