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
    const cleanedPhone = phoneNumber.replace(/\s/g, '')
    
    // ============================================
    // RATE LIMITING & COST OPTIMIZATION
    // ============================================
    // Check for recent OTP requests to prevent abuse and reduce costs
    const otpRef = db.collection('otp_verifications').doc(`${userType}_${userId}`)
    const existingOtpDoc = await otpRef.get()
    
    if (existingOtpDoc.exists) {
      const existingData = existingOtpDoc.data()
      const now = new Date()
      const createdAt = existingData.createdAt?.toDate() || new Date(0)
      const timeSinceLastOTP = (now - createdAt) / 1000 / 60 // minutes
      
      // Rate limit: Max 1 OTP per 2 minutes (cost optimization)
      if (timeSinceLastOTP < 2) {
        const waitTime = Math.ceil(2 - timeSinceLastOTP)
        return NextResponse.json(
          { 
            success: false, 
            error: `Please wait ${waitTime} minute(s) before requesting a new OTP. This helps us reduce costs.`,
            retryAfter: waitTime * 60
          },
          { status: 429 }
        )
      }
      
      // If previous OTP is still valid (not expired), reuse it to save costs
      const expiresAt = existingData.expiresAt?.toDate()
      if (expiresAt && now < expiresAt && !existingData.verified) {
        // Previous OTP still valid - don't send new one, just return success
        // This saves SMS costs!
        return NextResponse.json({
          success: true,
          message: 'Previous OTP is still valid. Please check your messages.',
          reused: true,
          expiresIn: Math.ceil((expiresAt - now) / 1000 / 60) // minutes remaining
        })
      }
    }
    
    // Generate new OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry

    // Store OTP in Firestore
    const docId = `${userType}_${userId}`
    console.log('Storing OTP:', { docId, userId, userType, phoneNumber: cleanedPhone })
    
    await otpRef.set({
      phoneNumber: cleanedPhone,
      otp,
      userId,
      userType,
      expiresAt: expiresAt,
      createdAt: new Date(),
      verified: false,
      attempts: 0,
      sentCount: (existingOtpDoc.exists ? (existingOtpDoc.data().sentCount || 0) + 1 : 1)
    })
    
    console.log('OTP stored successfully:', docId)

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
        message: 'OTP sent successfully via SMS',
        // Only return OTP in dev mode if Twilio is not configured
        ...(process.env.NODE_ENV === 'development' && smsResult.devMode && { otp })
      })
    } catch (smsError) {
      console.error('Failed to send OTP via Twilio:', smsError)
      
      // Check for specific error about phone number mismatch
      const isPhoneNumberError = smsError.message?.includes('21660') || 
                                 smsError.message?.includes('not associated with your Twilio account')
      
      // In development, check if it's a configuration issue
      if (process.env.NODE_ENV === 'development') {
        const isNotConfigured = smsError.message?.includes('not configured')
        
        if (isNotConfigured) {
          // Only log to console if Twilio is completely not configured
          console.warn(`⚠️ Twilio not configured. OTP for ${phoneNumber}: ${otp}`)
          return NextResponse.json({
            success: true,
            message: 'OTP sent successfully (dev mode - Twilio not configured)',
            otp,
            warning: 'Twilio not configured. Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to send SMS.'
          })
        } else {
          // For other errors (like phone number issues), show error but still return OTP for testing
          console.error(`❌ Twilio SMS Error: ${smsError.message}`)
          console.log(`[DEV MODE] OTP for ${phoneNumber}: ${otp}`)
          
          if (isPhoneNumberError) {
            console.warn(`[FIX REQUIRED] You're using the wrong phone number for SMS.`)
            console.warn(`[FIX REQUIRED] The WhatsApp sandbox number (+14155238886) cannot be used for SMS.`)
            console.warn(`[FIX REQUIRED] Go to Twilio Console → Phone Numbers → Buy a number for SMS.`)
            console.warn(`[FIX REQUIRED] Current TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER}`)
          }
          
          return NextResponse.json({
            success: true,
            message: 'OTP sent successfully (dev mode - SMS failed)',
            otp,
            warning: isPhoneNumberError 
              ? `Twilio error: ${smsError.message}. Check TWILIO_PHONE_NUMBER in .env`
              : `Twilio error: ${smsError.message}`,
            error: smsError.message
          })
        }
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

