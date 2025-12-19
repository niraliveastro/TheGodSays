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
 * GET /api/admin/stats
 * Get dashboard statistics: total calls, revenue, active users, etc.
 */
export async function GET(request) {
  try {
    const db = getFirestore()
    
    // Get all calls
    const callsSnapshot = await db.collection('calls').get()
    const allCalls = callsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Get all billing records
    const billingSnapshot = await db.collection('call_billing').get()
    const allBilling = billingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Calculate statistics
    const totalCalls = allCalls.length
    const completedCalls = allCalls.filter(c => c.status === 'completed').length
    const activeCalls = allCalls.filter(c => c.status === 'active').length
    const pendingCalls = allCalls.filter(c => c.status === 'pending').length
    const cancelledCalls = allCalls.filter(c => c.status === 'cancelled').length
    
    // Calculate total revenue from completed billing records
    const completedBilling = allBilling.filter(b => b.status === 'completed')
    const totalRevenue = completedBilling.reduce((sum, b) => sum + (b.finalAmount || 0), 0)
    
    // Calculate total duration
    const totalDuration = completedBilling.reduce((sum, b) => sum + (b.durationMinutes || 0), 0)
    
    // Get unique users and astrologers
    const uniqueUsers = new Set(allCalls.map(c => c.userId).filter(Boolean))
    const uniqueAstrologers = new Set(allCalls.map(c => c.astrologerId).filter(Boolean))
    
    // Calculate average call duration
    const avgDuration = completedBilling.length > 0 
      ? totalDuration / completedBilling.length 
      : 0
    
    // Calculate average call cost
    const avgCost = completedBilling.length > 0 
      ? totalRevenue / completedBilling.length 
      : 0
    
    // Get today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCalls = allCalls.filter(c => {
      const createdAt = c.createdAt
      let callDate
      if (typeof createdAt === 'string') {
        callDate = new Date(createdAt)
      } else if (createdAt && createdAt.toDate) {
        callDate = createdAt.toDate()
      } else {
        return false
      }
      return callDate >= today
    })
    
    const todayBilling = completedBilling.filter(b => {
      const endTime = b.endTime
      let billingDate
      if (endTime && typeof endTime === 'string') {
        billingDate = new Date(endTime)
      } else if (endTime && endTime.toDate) {
        billingDate = endTime.toDate()
      } else {
        return false
      }
      return billingDate >= today
    })
    
    const todayRevenue = todayBilling.reduce((sum, b) => sum + (b.finalAmount || 0), 0)
    
    // Get this month's stats
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    
    const monthCalls = allCalls.filter(c => {
      const createdAt = c.createdAt
      let callDate
      if (typeof createdAt === 'string') {
        callDate = new Date(createdAt)
      } else if (createdAt && createdAt.toDate) {
        callDate = createdAt.toDate()
      } else {
        return false
      }
      return callDate >= monthStart
    })
    
    const monthBilling = completedBilling.filter(b => {
      const endTime = b.endTime
      let billingDate
      if (endTime && typeof endTime === 'string') {
        billingDate = new Date(endTime)
      } else if (endTime && endTime.toDate) {
        billingDate = endTime.toDate()
      } else {
        return false
      }
      return billingDate >= monthStart
    })
    
    const monthRevenue = monthBilling.reduce((sum, b) => sum + (b.finalAmount || 0), 0)

    return NextResponse.json({
      success: true,
      stats: {
        totalCalls,
        completedCalls,
        activeCalls,
        pendingCalls,
        cancelledCalls,
        totalRevenue,
        totalDuration,
        avgDuration: Math.round(avgDuration * 100) / 100,
        avgCost: Math.round(avgCost * 100) / 100,
        uniqueUsers: uniqueUsers.size,
        uniqueAstrologers: uniqueAstrologers.size,
        todayCalls: todayCalls.length,
        todayRevenue,
        monthCalls: monthCalls.length,
        monthRevenue,
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

