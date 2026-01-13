import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { WalletService } from '@/lib/wallet'

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

// Helper function to calculate Quick Stats from call history
async function calculateQuickStats(userId) {
  try {
    // Initialize db lazily to avoid build-time errors
    const db = getFirestore()
    // Fetch all calls for the user
    const callsSnapshot = await db.collection('calls')
      .where('userId', '==', userId)
      .get()
    
    let totalCalls = 0
    const completedCalls = []
    
    // Filter completed/active calls first
    for (const callDoc of callsSnapshot.docs) {
      const callData = callDoc.data()
      if (callData.status === 'completed' || callData.status === 'active') {
        totalCalls++
        completedCalls.push(callDoc.id)
      }
    }
    
    // Fetch all billing data in parallel instead of sequentially
    const billingPromises = completedCalls.map(callId => 
      db.collection('call_billing').doc(callId).get().catch(() => null)
    )
    
    const billingDocs = await Promise.all(billingPromises)
    
    let totalMinutes = 0
    billingDocs.forEach((billingDoc, index) => {
      if (billingDoc && billingDoc.exists) {
        const billingData = billingDoc.data()
        const duration = billingData.durationMinutes || 0
        totalMinutes += typeof duration === 'number' ? duration : parseFloat(duration) || 0
      } else {
        // If no billing data, use default estimation
        totalMinutes += 10 // Default 10 minutes per call
      }
    })
    
    return { totalCalls, totalMinutes }
  } catch (error) {
    console.error('Error calculating Quick Stats:', error)
    return { totalCalls: 0, totalMinutes: 0 }
  }
}

export async function GET(request) {
  try {
    // Initialize db lazily to avoid build-time errors
    const db = getFirestore()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userType = searchParams.get('userType') || 'user'
    
    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 })
    }

    // Determine collection based on userType
    const collectionName = userType === 'astrologer' ? 'astrologers' : 'users'
    const userRef = db.collection(collectionName).doc(userId)
    const snap = await userRef.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const userData = snap.data() || {}
    
    // Fetch wallet balance and quick stats in parallel for better performance
    const [walletResult, statsResult] = await Promise.allSettled([
      WalletService.getWallet(userId).catch(() => ({ balance: 0 })),
      calculateQuickStats(userId).catch(() => ({ totalCalls: 0, totalMinutes: 0 }))
    ])
    
    // Extract results safely
    const balance = walletResult.status === 'fulfilled' 
      ? (walletResult.value.balance || 0) 
      : 0
    
    const { totalCalls, totalMinutes } = statsResult.status === 'fulfilled'
      ? statsResult.value
      : { totalCalls: 0, totalMinutes: 0 }
    
    return NextResponse.json({
      success: true,
      user: {
        id: snap.id,
        ...userData,
        balance,
        totalCalls,
        totalMinutes,
        minutesUsed: totalMinutes
      }
    })
  } catch (error) {
    console.error('Error in user profile GET:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    // Initialize db lazily to avoid build-time errors
    const db = getFirestore()
    const payload = await request.json()
    const { userId, name, email, phone } = payload || {}
    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 })
    }

    const userRef = db.collection('users').doc(userId)
    const snap = await userRef.get()
    const updatePayload = {}
    if (typeof name === 'string') updatePayload.name = name
    if (typeof email === 'string') updatePayload.email = email
    if (typeof phone === 'string') updatePayload.phone = phone

    if (snap.exists) {
      await userRef.update(updatePayload)
    } else {
      await userRef.set({ ...updatePayload, createdAt: new Date().toISOString() })
    }

    const updated = await userRef.get()
    const updatedUserData = updated.data() || {}
    
    // Fetch wallet balance and quick stats in parallel for better performance
    const [walletResult, statsResult] = await Promise.allSettled([
      WalletService.getWallet(userId).catch(() => ({ balance: 0 })),
      calculateQuickStats(userId).catch(() => ({ totalCalls: 0, totalMinutes: 0 }))
    ])
    
    // Extract results safely
    const balance = walletResult.status === 'fulfilled' 
      ? (walletResult.value.balance || 0) 
      : 0
    
    const { totalCalls, totalMinutes } = statsResult.status === 'fulfilled'
      ? statsResult.value
      : { totalCalls: 0, totalMinutes: 0 }
    
    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        ...updatedUserData,
        balance,
        totalCalls,
        totalMinutes,
        minutesUsed: totalMinutes
      }
    })
  } catch (error) {
    console.error('Error in user profile PUT:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
