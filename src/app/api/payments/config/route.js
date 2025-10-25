import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    // Check if Razorpay key is configured
    if (!process.env.RAZORPAY_KEY_ID) {
      return NextResponse.json({
        error: 'Razorpay key not configured'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID
    })
  } catch (error) {
    console.error('Error getting payment config:', error)
    return NextResponse.json({
      error: 'Failed to get payment configuration'
    }, { status: 500 })
  }
}