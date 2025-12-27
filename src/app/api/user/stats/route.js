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
 * Get user spending statistics from user_stats collection (cached)
 * Falls back to calculating from call_billing if stats don't exist
 */
export async function GET(request) {
  const db = getFirestore()
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 })
    }

    // Try to get cached stats from user_stats collection
    try {
      const statsDoc = await db.collection('user_stats').doc(userId).get()
      if (statsDoc.exists) {
        const stats = statsDoc.data()
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        // Check if monthly stats are for current month
        const statsMonth = stats.lastUpdated ? new Date(stats.lastUpdated).getMonth() : -1
        const statsYear = stats.lastUpdated ? new Date(stats.lastUpdated).getFullYear() : -1
        
        if (statsMonth === currentMonth && statsYear === currentYear) {
          // Stats are current, return cached data
          return NextResponse.json({
            success: true,
            totalSpending: stats.totalSpending || 0,
            monthlySpending: stats.monthlySpending || 0,
            cached: true,
            lastUpdated: stats.lastUpdated
          })
        }
      }
    } catch (error) {
      console.log('Could not fetch cached stats, will calculate:', error.message)
    }

    // Calculate from call_billing collection (source of truth for billing)
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    // Set month start to beginning of current month
    const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0)
    // Set month end to end of current month
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    // Get all billing records for this user from call_billing collection
    // This is the authoritative source for spending
    let billingSnapshot
    try {
      billingSnapshot = await db.collection('call_billing')
        .where('userId', '==', userId)
        .where('status', '==', 'completed')
        .get()
    } catch (error) {
      console.error('Error fetching billing records:', error)
      // Fallback: return zero values
      return NextResponse.json({
        success: true,
        totalSpending: 0,
        monthlySpending: 0,
        cached: false
      })
    }

    let totalSpending = 0
    let monthlySpending = 0

    billingSnapshot.forEach((doc) => {
      const billingData = doc.data()
      
      // Get finalAmount from billing (this is the actual charged amount)
      const cost = billingData.finalAmount || billingData.totalCost || 0
      const costNum = typeof cost === 'number' ? cost : parseFloat(cost) || 0
      
      if (costNum > 0 && !isNaN(costNum)) {
        // Add to total spending (all time)
        totalSpending += costNum

        // Check if this billing is from current month using createdAt or startTime
        let billingDate = null
        const dateField = billingData.createdAt || billingData.startTime || billingData.created_at
        
        if (dateField) {
          try {
            if (dateField.toDate && typeof dateField.toDate === 'function') {
              billingDate = dateField.toDate()
            } else if (typeof dateField === 'string') {
              billingDate = new Date(dateField)
            } else if (dateField._seconds !== undefined) {
              // Firestore timestamp format
              billingDate = new Date(dateField._seconds * 1000 + (dateField._nanoseconds || 0) / 1000000)
            } else if (dateField instanceof Date) {
              billingDate = dateField
            } else {
              billingDate = new Date(dateField)
            }
            
            // Validate the date
            if (isNaN(billingDate.getTime())) {
              billingDate = null
            }
          } catch (e) {
            console.warn('Error parsing billing date:', e)
            billingDate = null
          }
        }
        
        // Check if billing is from current month (only if we have a valid date)
        if (billingDate && billingDate >= monthStart && billingDate <= monthEnd) {
          monthlySpending += costNum
        }
      }
    })

    // Cache the results in user_stats collection (async, don't wait)
    db.collection('user_stats').doc(userId).set({
      totalSpending,
      monthlySpending,
      lastUpdated: new Date(),
    }).catch(err => console.error('Error caching stats:', err))

    return NextResponse.json({
      success: true,
      totalSpending,
      monthlySpending,
      cached: false
    })
  } catch (error) {
    console.error('Error getting user stats:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 })
  }
}

