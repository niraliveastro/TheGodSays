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

    const order = await razorpay.orders.create(options)
    return order
  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    throw new Error('Failed to create payment order')
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