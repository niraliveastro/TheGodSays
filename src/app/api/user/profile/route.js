import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { WalletService } from '@/lib/wallet'

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
    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 })
    }

    const userRef = db.collection('users').doc(userId)
    const snap = await userRef.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const userData = snap.data() || {}
    
    // Fetch wallet balance from wallets collection
    let balance = 0
    try {
      const walletData = await WalletService.getWallet(userId)
      balance = walletData.balance || 0
    } catch (error) {
      console.warn('Failed to fetch wallet balance:', error.message)
      // Don't fail the entire request if wallet fetch fails
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: snap.id,
        ...userData,
        balance
      }
    })
  } catch (error) {
    console.error('Error in user profile GET:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
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
    
    // Also fetch wallet balance for PUT response
    let balance = 0
    try {
      const walletData = await WalletService.getWallet(userId)
      balance = walletData.balance || 0
    } catch (error) {
      console.warn('Failed to fetch wallet balance:', error.message)
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        ...updatedUserData,
        balance
      }
    })
  } catch (error) {
    console.error('Error in user profile PUT:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
