import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { sendOTP } from '@/lib/twilio'

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
 * Generate a random 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * POST /api/otp/send
 * Send OTP to phone number
 * Body: { phoneNumber, userId, userType: 'user' | 'astrologer' }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { phoneNumber, userId, userType } = body

    // Validate input
    if (!phoneNumber || !userId || !userType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: phoneNumber, userId, userType' },
        { status: 400 }
      )
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
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
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry

    // Store OTP in Firestore
    const otpRef = db.collection('otp_verifications').doc(`${userType}_${userId}`)
    await otpRef.set({
      phoneNumber: phoneNumber.replace(/\s/g, ''),
      otp,
      userId,
      userType,
      expiresAt: expiresAt,
      createdAt: new Date(),
      verified: false,
      attempts: 0
    })

    // Send OTP via Twilio SMS
    try {
      const smsResult = await sendOTP(phoneNumber, otp)
      
      // Update Firestore with SMS status
      await otpRef.update({
        smsSid: smsResult.messageSid,
        smsStatus: smsResult.status,
        smsSentAt: new Date()
      })

      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully',
        // In development, return OTP for testing
        ...(process.env.NODE_ENV === 'development' && { otp })
      })
    } catch (smsError) {
      console.error('Failed to send OTP via Twilio:', smsError)
      
      // Check for specific error about phone number mismatch
      const isPhoneNumberError = smsError.message?.includes('21660') || 
                                 smsError.message?.includes('not associated with your Twilio account')
      
      // In development, still return success with OTP (for testing)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV MODE] OTP for ${phoneNumber}: ${otp}`)
        console.warn(`[TWILIO ERROR] ${smsError.message}`)
        
        if (isPhoneNumberError) {
          console.warn(`[FIX REQUIRED] You're using the wrong phone number for SMS.`)
          console.warn(`[FIX REQUIRED] The WhatsApp sandbox number (+14155238886) cannot be used for SMS.`)
          console.warn(`[FIX REQUIRED] Go to Twilio Console → Phone Numbers → Buy a number for SMS.`)
        }
        
        return NextResponse.json({
          success: true,
          message: 'OTP sent successfully (dev mode)',
          otp,
          warning: isPhoneNumberError 
            ? 'Twilio phone number mismatch - using dev mode. Please purchase a phone number for SMS.'
            : 'Twilio error - using dev mode',
          error: smsError.message
        })
      }
      
      // In production, return error with helpful message
      return NextResponse.json(
        { 
          success: false, 
          error: isPhoneNumberError
            ? 'SMS service not properly configured. Please contact support.'
            : 'Failed to send OTP. Please try again later.',
          message: smsError.message,
          code: smsError.code || 'unknown'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending OTP:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send OTP', message: error.message },
      { status: 500 }
    )
  }
}

