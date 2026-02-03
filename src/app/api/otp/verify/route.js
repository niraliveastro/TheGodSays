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
    const docId = `${userType}_${userId}`
    const otpRef = db.collection('otp_verifications').doc(docId)
    const otpDoc = await otpRef.get()

    if (!otpDoc.exists) {
      // Log for debugging
      console.error('OTP not found:', {
        docId,
        userId,
        userType,
        phoneNumber: phoneNumber.replace(/\s/g, '')
      })
      
      // Try to find OTP by phone number as fallback
      try {
        const phoneQuery = db.collection('otp_verifications')
          .where('phoneNumber', '==', phoneNumber.replace(/\s/g, ''))
          .where('userType', '==', userType)
          .orderBy('createdAt', 'desc')
          .limit(1)
        
        const phoneSnapshot = await phoneQuery.get()
        if (!phoneSnapshot.empty) {
          const foundDoc = phoneSnapshot.docs[0]
          console.log('Found OTP by phone number:', foundDoc.id)
          // Use the found document
          const foundData = foundDoc.data()
          const foundOtpRef = db.collection('otp_verifications').doc(foundDoc.id)
          
          // Check expiry
          const expiresAt = foundData.expiresAt?.toDate()
          if (new Date() > expiresAt) {
            return NextResponse.json(
              { success: false, error: 'OTP has expired. Please request a new OTP.' },
              { status: 400 }
            )
          }
          
          // Verify OTP
          if (foundData.otp !== otp) {
            await foundOtpRef.update({
              attempts: (foundData.attempts || 0) + 1
            })
            return NextResponse.json(
              { success: false, error: 'Invalid OTP' },
              { status: 400 }
            )
          }
          
          // Mark as verified
          await foundOtpRef.update({
            verified: true,
            verifiedAt: new Date()
          })
          
          // Update user document
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
        }
      } catch (fallbackError) {
        console.error('Fallback search failed:', fallbackError)
      }
      
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

    // Check phone number match (normalize both for comparison)
    const normalizedStored = otpData.phoneNumber.replace(/\s/g, '').replace(/[^\d+]/g, '')
    const normalizedProvided = phoneNumber.replace(/\s/g, '').replace(/[^\d+]/g, '')
    
    if (normalizedStored !== normalizedProvided) {
      console.error('Phone number mismatch:', {
        stored: normalizedStored,
        provided: normalizedProvided,
        rawStored: otpData.phoneNumber,
        rawProvided: phoneNumber
      })
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

