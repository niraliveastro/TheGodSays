import { NextResponse } from 'next/server'
import { AIPricingService } from '@/lib/ai-pricing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/pricing
 * Get current AI pricing (passcode-protected on frontend)
 */
export async function GET(request) {
  try {
    // Note: Frontend passcode check handles authentication
    // This endpoint is accessible to anyone, but frontend requires passcode
    const pricing = await AIPricingService.getPricing()
    return NextResponse.json({ pricing })
  } catch (error) {
    console.error('Error in GET /api/admin/pricing:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/pricing
 * Set AI pricing (passcode-protected on frontend)
 * Body: { creditsPerQuestion }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { creditsPerQuestion } = body

    // Note: Frontend passcode check handles authentication
    // This endpoint is accessible to anyone, but frontend requires passcode

    if (typeof creditsPerQuestion !== 'number' || creditsPerQuestion < 1) {
      return NextResponse.json(
        { error: 'creditsPerQuestion must be a positive number' },
        { status: 400 }
      )
    }

    const pricing = await AIPricingService.setPricing(creditsPerQuestion)
    return NextResponse.json({ pricing })
  } catch (error) {
    console.error('Error in POST /api/admin/pricing:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
