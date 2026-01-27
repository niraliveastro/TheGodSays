import Razorpay from 'razorpay'
import crypto from 'crypto'

let razorpayInstance = null

export const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.')
    }

    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }

  return razorpayInstance
}

export const createRazorpayOrder = async (amount, currency = 'INR', receipt, notes = {}) => {
  try {
    const razorpay = getRazorpayInstance()

    // Generate a shorter receipt if not provided (max 40 chars)
    const shortReceipt = receipt && receipt.length <= 40
      ? receipt
      : `wallet-${Date.now()}`.slice(-40) // Keep only last 40 chars

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: shortReceipt,
      notes,
    }

    console.log('Creating Razorpay order with options:', {
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      keyId: process.env.RAZORPAY_KEY_ID?.substring(0, 10) + '...'
    })

    const order = await razorpay.orders.create(options)
    console.log('Razorpay order created successfully:', order.id)
    return order
  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error
    })
    
    // Provide more specific error messages
    if (error.statusCode === 400) {
      throw new Error('Invalid payment details. Please check the amount and try again.')
    } else if (error.statusCode === 401) {
      throw new Error('Payment gateway authentication failed. Please contact support.')
    } else if (error.statusCode === 500) {
      throw new Error('Payment gateway server error. Please try again later or contact support.')
    }
    
    throw new Error('Failed to create payment order. Please try again.')
  }
}

export const verifyRazorpayPayment = (paymentData) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData

    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex')

    return expectedSignature === razorpay_signature
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error)
    return false
  }
}