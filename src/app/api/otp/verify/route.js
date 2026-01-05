import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

/**
 * POST /api/otp/verify
 * Verify OTP and mark phone number as verified
 * Body: { phoneNumber, userId, userType, otp }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { phoneNumber, userId, userType, otp } = body

    // Validate input
    if (!phoneNumber || !userId || !userType || !otp) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: phoneNumber, userId, userType, otp' },
        { status: 400 }
      )
    }

    // Validate userType
    if (!['user', 'astrologer'].includes(userType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid userType. Must be "user" or "astrologer"' },
        { status: 400 }
      )
    }

    const db = getFirestore()
    const otpRef = db.collection('otp_verifications').doc(`${userType}_${userId}`)
    const otpDoc = await otpRef.get()

    if (!otpDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'OTP not found. Please request a new OTP.' },
        { status: 404 }
      )
    }

    const otpData = otpDoc.data()

    // Check if already verified
    if (otpData.verified) {
      return NextResponse.json(
        { success: false, error: 'Phone number already verified' },
        { status: 400 }
      )
    }

    // Check expiry
    const expiresAt = otpData.expiresAt.toDate()
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new OTP.' },
        { status: 400 }
      )
    }

    // Check phone number match
    if (otpData.phoneNumber !== phoneNumber.replace(/\s/g, '')) {
      return NextResponse.json(
        { success: false, error: 'Phone number mismatch' },
        { status: 400 }
      )
    }

    // Check attempts (max 5 attempts)
    if (otpData.attempts >= 5) {
      return NextResponse.json(
        { success: false, error: 'Too many verification attempts. Please request a new OTP.' },
        { status: 429 }
      )
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      await otpRef.update({
        attempts: (otpData.attempts || 0) + 1
      })
      return NextResponse.json(
        { success: false, error: 'Invalid OTP' },
        { status: 400 }
      )
    }

    // Mark as verified
    await otpRef.update({
      verified: true,
      verifiedAt: new Date()
    })

    // Update user/astrologer document with verified phone number
    const collectionName = userType === 'astrologer' ? 'astrologers' : 'users'
    const userRef = db.collection(collectionName).doc(userId)
    const userDoc = await userRef.get()

    if (userDoc.exists) {
      await userRef.update({
        phoneNumber: phoneNumber.replace(/\s/g, ''),
        phoneVerified: true,
        phoneVerifiedAt: new Date()
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully'
    })
  } catch (error) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP', message: error.message },
      { status: 500 }
    )
  }
}

