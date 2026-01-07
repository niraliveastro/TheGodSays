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

/**
 * Apply coupon to a payment amount
 * This calculates the discount but doesn't redeem the coupon yet
 */
export async function POST(request) {
  try {
    const { code, userId, amount } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { ok: false, reason: 'BAD_CODE', message: 'Invalid coupon code' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { ok: false, reason: 'NO_USER_ID', message: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, reason: 'INVALID_AMOUNT', message: 'Valid amount is required' },
        { status: 400 }
      )
    }

    const db = getFirestore()
    const couponCode = code.trim().toUpperCase()
    const couponRef = db.collection('coupons').doc(couponCode)
    const walletRef = db.collection('wallets').doc(userId)

    const [couponSnap, walletSnap] = await Promise.all([
      couponRef.get(),
      walletRef.get(),
    ])

    if (!couponSnap.exists) {
      return NextResponse.json({
        ok: false,
        reason: 'NOT_FOUND',
        message: 'Coupon not found',
      })
    }

    const coupon = couponSnap.data()
    const wallet = walletSnap.exists ? walletSnap.data() : { usedCoupons: {} }
    const usedCoupons = wallet.usedCoupons || {}

    // Validate coupon
    if (!coupon.active) {
      return NextResponse.json({
        ok: false,
        reason: 'INACTIVE',
        message: 'This coupon is inactive',
      })
    }

    const now = admin.firestore.Timestamp.now()
    if (coupon.expiresAt && coupon.expiresAt.toMillis() <= now.toMillis()) {
      return NextResponse.json({
        ok: false,
        reason: 'EXPIRED',
        message: 'This coupon has expired',
      })
    }

    // Check usage restrictions
    if (coupon.type === 'one_time') {
      if (coupon.usedCount > 0) {
        return NextResponse.json({
          ok: false,
          reason: 'ALREADY_USED',
          message: 'This coupon has already been used',
        })
      }
    } else if (coupon.type === 'multi_use') {
      if (usedCoupons[couponCode]) {
        return NextResponse.json({
          ok: false,
          reason: 'USED_BY_YOU',
          message: 'You have already used this coupon',
        })
      }

      const usedCount = coupon.usedCount || 0
      const maxUses = coupon.maxUses
      if (maxUses && usedCount >= maxUses) {
        return NextResponse.json({
          ok: false,
          reason: 'MAXED_OUT',
          message: 'This coupon has reached its usage limit',
        })
      }
    }

    const discountAmount = Number(coupon.amount || 0)
    if (discountAmount <= 0) {
      return NextResponse.json({
        ok: false,
        reason: 'BAD_COUPON_AMOUNT',
        message: 'Invalid coupon amount',
      })
    }

    // Calculate final amount after coupon
    // For now, coupons add to wallet balance, but we could also implement discount types
    // This API validates and returns the discount info
    const finalAmount = Math.max(0, amount) // Amount stays the same, coupon adds to wallet balance

    return NextResponse.json({
      ok: true,
      coupon: {
        code: couponCode,
        type: coupon.type,
        discountAmount,
      },
      originalAmount: amount,
      finalAmount,
      message: `Coupon validated. ₹${discountAmount} will be added to your wallet.`,
    })
  } catch (err) {
    console.error('Apply coupon API error:', err)
    return NextResponse.json(
      { ok: false, reason: 'SERVER_ERROR', message: err.message },
      { status: 500 }
    )
  }
}

