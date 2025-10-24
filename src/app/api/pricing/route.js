import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
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
    const { action, astrologerId, pricingType, basePrice, discountPercent, callDurationMins } = await request.json()

    // Validate action
    const validActions = ['set-pricing', 'get-pricing', 'update-pricing', 'get-all-pricing']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    switch (action) {
      case 'set-pricing':
        if (!astrologerId) {
          return NextResponse.json({ error: 'Astrologer ID is required' }, { status: 400 })
        }

        if (!pricingType || !basePrice) {
          return NextResponse.json({ error: 'Pricing type and base price are required' }, { status: 400 })
        }

        try {
          const pricingConfig = {
            pricingType,
            basePrice: parseFloat(basePrice),
            discountPercent: parseFloat(discountPercent) || 0,
            callDurationMins: pricingType === 'per_call' ? (callDurationMins ? parseInt(callDurationMins) : 30) : 30
          }

          const result = await PricingService.setPricing(astrologerId, pricingConfig)
          return NextResponse.json({ success: true, pricing: result.pricing })
        } catch (error) {
          console.error('Error setting pricing:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'get-pricing':
        if (!astrologerId) {
          return NextResponse.json({ error: 'Astrologer ID is required' }, { status: 400 })
        }

        try {
          const pricing = await PricingService.getPricing(astrologerId)
          return NextResponse.json({ success: true, pricing })
        } catch (error) {
          console.error('Error getting pricing:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'update-pricing':
        if (!astrologerId) {
          return NextResponse.json({ error: 'Astrologer ID is required' }, { status: 400 })
        }

        try {
          const updates = {}
          if (pricingType) updates.pricingType = pricingType
          if (basePrice) updates.basePrice = basePrice
          if (discountPercent !== undefined) updates.discountPercent = discountPercent
          if (callDurationMins) updates.callDurationMins = callDurationMins

          const result = await PricingService.updatePricing(astrologerId, updates)
          return NextResponse.json({ success: true, pricing: result.pricing })
        } catch (error) {
          console.error('Error updating pricing:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      case 'get-all-pricing':
        try {
          const allPricing = await PricingService.getAllPricing()
          return NextResponse.json({ success: true, pricing: allPricing })
        } catch (error) {
          console.error('Error getting all pricing:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in pricing API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}