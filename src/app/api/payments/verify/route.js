import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { verifyRazorpayPayment } from '@/lib/razorpay'
import { WalletService } from '@/lib/wallet'

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
    const paymentData = await request.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = paymentData

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment verification data' }, { status: 400 })
    }

    // Verify payment signature
    const isValidPayment = verifyRazorpayPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    })

    if (!isValidPayment) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const db = admin.firestore()

    try {
      // Fetch order details from Firestore to get the amount
      const orderRef = db.collection('orders').doc(razorpay_order_id)
      const orderDoc = await orderRef.get()

      if (!orderDoc.exists) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const orderData = orderDoc.data()
      const amount = orderData.amount / 100 // Convert from paise to rupees

      // Add money to user's wallet
      const transactionId = `payment-${razorpay_payment_id}`

      // Get wallet before adding money for debugging
      const walletBefore = await WalletService.getWallet(userId)
      console.log('Payment verification - Before:', {
        userId,
        amount,
        balanceBefore: walletBefore.balance,
        transactionCount: walletBefore.transactions?.length || 0
      })

      await WalletService.addMoney(
        userId,
        amount,
        transactionId,
        `Payment successful - ${razorpay_payment_id}`
      )

      // Get wallet after adding money for debugging
      const walletAfter = await WalletService.getWallet(userId)
      console.log('Payment verification - After:', {
        userId,
        amount,
        balanceAfter: walletAfter.balance,
        balanceDifference: walletAfter.balance - walletBefore.balance,
        transactionCount: walletAfter.transactions?.length || 0
      })

      // Update order status
      await orderRef.update({ status: 'completed' })

      // Store payment record
      const paymentRef = db.collection('payments').doc(razorpay_payment_id)
      await paymentRef.set({
        userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: 'completed',
        verifiedAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: 'Payment verified and wallet updated',
        paymentId: razorpay_payment_id
      })

    } catch (walletError) {
      console.error('Error updating wallet:', walletError)

      // Store failed payment record
      const paymentRef = db.collection('payments').doc(razorpay_payment_id)
      await paymentRef.set({
        userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: 'failed',
        error: walletError.message,
        verifiedAt: new Date(),
      })

      return NextResponse.json({ error: 'Payment verified but wallet update failed' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 })
  }
}