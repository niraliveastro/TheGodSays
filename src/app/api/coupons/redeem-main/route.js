import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from '@/lib/firebase-admin'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { code, userId } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { ok: false, reason: 'BAD_CODE' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { ok: false, reason: 'NO_USER_ID' },
        { status: 400 }
      )
    }

    const db = getFirestore()
    const couponCode = code.trim().toUpperCase()
    const couponRef = db.collection('coupons').doc(couponCode)
    const walletRef = db.collection('wallets').doc(userId)

    // Use transaction to ensure data consistency
    const result = await db.runTransaction(async (tx) => {
      const [couponSnap, walletSnap] = await Promise.all([
        tx.get(couponRef),
        tx.get(walletRef),
      ])

      if (!couponSnap.exists) {
        return { ok: false, reason: 'NOT_FOUND' }
      }

      const coupon = couponSnap.data()
      
      // Check if coupon is active
      if (!coupon.active) {
        return { ok: false, reason: 'INACTIVE' }
      }

      // Check if coupon is expired
      const now = admin.firestore.Timestamp.now()
      if (coupon.expiresAt && coupon.expiresAt.toMillis() <= now.toMillis()) {
        return { ok: false, reason: 'EXPIRED' }
      }

      // Get or create wallet
      const wallet = walletSnap.exists
        ? walletSnap.data()
        : { balance: 0, transactions: [], usedCoupons: {} }

      // Track coupon usage per user
      const usedCoupons = wallet.usedCoupons || {}
      const userCouponUsage = usedCoupons[couponCode] || { count: 0, firstUsed: null }
      
      // Validate coupon type-specific restrictions
      if (coupon.type === 'one_time_global') {
        // Only one person can ever use this coupon globally
        if (coupon.usedCount > 0) {
          return { ok: false, reason: 'ALREADY_USED' }
        }
      } else if (coupon.type === 'once_per_user') {
        // Each user can use it once, but unlimited users can use it
        if (userCouponUsage.count > 0) {
          return { ok: false, reason: 'USED_BY_YOU' }
        }
      } else if (coupon.type === 'multiple_per_user') {
        // Same user can use multiple times, check per-user limit
        const maxUsesPerUser = coupon.maxUsesPerUser
        if (maxUsesPerUser && userCouponUsage.count >= maxUsesPerUser) {
          return { ok: false, reason: 'USER_LIMIT_REACHED' }
        }
      } else if (coupon.type === 'limited_total') {
        // Limited total uses across all users
        const usedCount = coupon.usedCount || 0
        const maxUses = coupon.maxUses
        if (!maxUses || usedCount >= maxUses) {
          return { ok: false, reason: 'MAXED_OUT' }
        }
      } else if (coupon.type === 'first_time_only') {
        // Only for new users (users with no transactions except coupon redemptions)
        const transactions = wallet.transactions || []
        const nonCouponTransactions = transactions.filter(t => 
          !t.description || !t.description.includes('Coupon redeemed')
        )
        if (nonCouponTransactions.length > 0) {
          return { ok: false, reason: 'NOT_ELIGIBLE' }
        }
        // Also check if user already used this coupon
        if (userCouponUsage.count > 0) {
          return { ok: false, reason: 'USED_BY_YOU' }
        }
      }

      const amount = Number(coupon.amount || 0)
      if (amount <= 0) {
        return { ok: false, reason: 'BAD_COUPON_AMOUNT' }
      }

      // Round amount to 2 decimal places to avoid floating point precision issues
      const roundedAmount = Math.round(amount * 100) / 100

      // Get current wallet balance
      const currentBalance = wallet.balance || 0
      
      // Add transaction record
      // Note: Cannot use FieldValue.serverTimestamp() inside array elements, must use Date object
      const transaction = {
        id: `coupon-${couponCode}-${Date.now()}`,
        type: 'credit',
        amount: roundedAmount,
        description: `Coupon redeemed: ${couponCode}`,
        timestamp: new Date(),
        status: 'completed'
      }

      // Update user's coupon usage tracking
      const updatedUserCouponUsage = {
        count: (userCouponUsage.count || 0) + 1,
        firstUsed: userCouponUsage.firstUsed || now.toMillis(),
        lastUsed: now.toMillis()
      }

      // Update wallet - add directly to wallet balance
      const walletUpdateData = {
        balance: admin.firestore.FieldValue.increment(roundedAmount),
        usedCoupons: {
          ...usedCoupons,
          [couponCode]: updatedUserCouponUsage,
        },
        transactions: admin.firestore.FieldValue.arrayUnion(transaction),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      // If wallet doesn't exist, initialize it
      if (!walletSnap.exists) {
        walletUpdateData.userId = userId
        walletUpdateData.createdAt = admin.firestore.FieldValue.serverTimestamp()
      }

      tx.set(walletRef, walletUpdateData, { merge: true })

      // Update coupon global usage count (for all types except first_time_only which doesn't need it)
      const couponUpdateData = {
        usedCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      // Deactivate one_time_global after first use
      if (coupon.type === 'one_time_global') {
        couponUpdateData.active = false
      }

      // Deactivate limited_total when max uses reached
      if (coupon.type === 'limited_total') {
        const usedCount = (coupon.usedCount || 0) + 1
        const maxUses = coupon.maxUses
        if (maxUses && usedCount >= maxUses) {
          couponUpdateData.active = false
        }
      }

      tx.update(couponRef, couponUpdateData)

      return { ok: true, amount: roundedAmount, newBalance: currentBalance + roundedAmount }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('Redeem coupon API error:', err)
    return NextResponse.json(
      { ok: false, reason: 'SERVER_ERROR', error: err.message },
      { status: 500 }
    )
  }
}

