import { NextResponse } from 'next/server'
import { AIPricingService } from '@/lib/ai-pricing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/pricing/public
 * Get current AI pricing (public endpoint - no auth required)
 */
export async function GET() {
  try {
    const pricing = await AIPricingService.getPricing()
    return NextResponse.json({ pricing })
  } catch (error) {
    console.error('Error in GET /api/pricing/public:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
