import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { BillingService } from '@/lib/billing'
import { PricingService } from '@/lib/pricing'

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

export async function POST(request) {
  try {
    const { action, callId, userId, astrologerId, durationMinutes } = await request.json()

    // Validate action
     const validActions = [
       'validate-balance',
       'initialize-call',
       'update-duration',
       'finalize-call',
       'immediate-settlement',
       'cancel-call',
       'get-call-billing',
       'get-user-history',
       'get-earnings'
     ]
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    switch (action) {
      case 'validate-balance':
        if (!userId || !astrologerId) {
          return NextResponse.json({ error: 'User ID and Astrologer ID are required' }, { status: 400 })
        }

        try {
          const validation = await BillingService.validateBalanceForCall(userId, astrologerId)
          return NextResponse.json({ success: true, validation })
        } catch (error) {
          console.error('Error validating balance:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'initialize-call':
        if (!callId || !userId || !astrologerId) {
          return NextResponse.json({ error: 'Call ID, User ID, and Astrologer ID are required' }, { status: 400 })
        }

        try {
          // First validate balance
          const validation = await BillingService.validateBalanceForCall(userId, astrologerId)
          if (!validation.hasBalance) {
            return NextResponse.json({
              error: `Insufficient balance. Required: ₹${validation.minimumRequired}, Available: ₹${validation.currentBalance}`
            }, { status: 400 })
          }

          const result = await BillingService.initializeCallBilling(callId, userId, astrologerId)
          return NextResponse.json({ success: true, ...result })
        } catch (error) {
          console.error('Error initializing call billing:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'update-duration':
        if (!callId || durationMinutes === undefined) {
          return NextResponse.json({ error: 'Call ID and duration minutes are required' }, { status: 400 })
        }

        try {
          const result = await BillingService.updateCallDuration(callId, durationMinutes)
          return NextResponse.json({ success: true, ...result })
        } catch (error) {
          console.error('Error updating call duration:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'finalize-call':
        if (!callId || durationMinutes === undefined) {
          return NextResponse.json({ error: 'Call ID and duration minutes are required' }, { status: 400 })
        }

        try {
          const result = await BillingService.immediateCallSettlement(callId, durationMinutes)
          return NextResponse.json({ success: true, ...result })
        } catch (error) {
          console.error('Error finalizing call billing:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'immediate-settlement':
        if (!callId || durationMinutes === undefined) {
          return NextResponse.json({ error: 'Call ID and duration minutes are required' }, { status: 400 })
        }

        try {
          const result = await BillingService.immediateCallSettlement(callId, durationMinutes)
          return NextResponse.json({ success: true, ...result })
        } catch (error) {
          console.error('Error in immediate call settlement:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'cancel-call':
        if (!callId) {
          return NextResponse.json({ error: 'Call ID is required' }, { status: 400 })
        }

        try {
          const result = await BillingService.cancelCallBilling(callId)
          // If cancellation failed, return error response
          if (!result.success) {
            return NextResponse.json({ 
              success: false, 
              error: result.error || 'Failed to cancel call billing' 
            }, { status: 400 })
          }
          // Success - return result (may include message about no record found)
          return NextResponse.json({ success: true, ...result })
        } catch (error) {
          console.error('Error cancelling call billing:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'get-call-billing':
        if (!callId) {
          return NextResponse.json({ error: 'Call ID is required' }, { status: 400 })
        }

        try {
          const billing = await BillingService.getCallBilling(callId)
          if (!billing) {
            return NextResponse.json({ error: 'Call billing not found' }, { status: 404 })
          }
          return NextResponse.json({ success: true, billing })
        } catch (error) {
          console.error('Error getting call billing:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'get-user-history':
        if (!userId) {
          return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        try {
          const history = await BillingService.getUserCallHistory(userId)
          return NextResponse.json({ success: true, history })
        } catch (error) {
          console.error('Error getting user call history:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'get-earnings':
        if (!astrologerId) {
          return NextResponse.json({ error: 'Astrologer ID is required' }, { status: 400 })
        }

        try {
          const earnings = await BillingService.getAstrologerEarnings(astrologerId)
          return NextResponse.json({ success: true, earnings })
        } catch (error) {
          console.error('Error getting astrologer earnings:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in billing API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}