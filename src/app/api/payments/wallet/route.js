import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { WalletService } from '@/lib/wallet'
import { createRazorpayOrder } from '@/lib/razorpay'

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
      })
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

export async function POST(request) {
  try {
    // Check if request has a body before parsing
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { action, userId, amount } = body;

    // Validate action
    const validActions = ['recharge', 'get-balance', 'get-history'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.length > 100) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    switch (action) {
      case 'recharge':
        if (!amount || amount < 15) {
          return NextResponse.json({ error: 'Minimum recharge amount is ₹15' }, { status: 400 })
        }

        try {
          // Create Razorpay order (receipt max 40 chars)
          const order = await createRazorpayOrder(
            amount,
            'INR',
            `W-${userId.slice(-8)}-${Date.now()}`,
            { userId, type: 'wallet_recharge' }
          )

          console.log('Razorpay order created successfully:', order.id)

          // Store order in Firestore for later verification
          const db = admin.firestore()
          const orderRef = db.collection('orders').doc(order.id)
          await orderRef.set({
            userId,
            amount: order.amount,
            currency: order.currency,
            status: 'created',
            createdAt: new Date()
          })

          return NextResponse.json({
            success: true,
            order: {
              id: order.id,
              amount: order.amount,
              currency: order.currency
            }
          })
        } catch (error) {
          console.error('Error creating recharge order:', error)
          console.error('Razorpay error details:', {
            message: error.message,
            statusCode: error.statusCode,
            description: error.description,
            source: error.source,
            step: error.step,
            reason: error.reason,
            metadata: error.metadata
          })
          return NextResponse.json({
            error: error.message || 'Failed to create payment order. Please check Razorpay configuration.',
            details: error.description || error.reason || 'Unknown error'
          }, { status: 500 })
        }

      case 'get-balance':
        try {
          const wallet = await WalletService.getWallet(userId)
          return NextResponse.json({ success: true, wallet })
        } catch (error) {
          console.error('Error getting wallet balance:', error)
          return NextResponse.json({ error: 'Failed to fetch wallet balance' }, { status: 500 })
        }

      case 'get-history':
        try {
          const history = await WalletService.getTransactionHistory(userId, 20)
          return NextResponse.json({ success: true, history })
        } catch (error) {
          console.error('Error getting wallet history:', error)
          return NextResponse.json({ error: 'Failed to fetch wallet history' }, { status: 500 })
        }


      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in wallet API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}