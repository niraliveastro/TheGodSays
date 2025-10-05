import { NextResponse } from 'next/server'
import astrologyAPI from '../../lib/api'

// POST /samvatinfo
// Expects body with the schema provided by the user.
export async function POST(request) {
  try {
    const body = await request.json()

    // Basic validation: ensure required keys are present
    const requiredTop = ['year', 'month', 'date', 'hours', 'minutes', 'seconds', 'latitude', 'longitude', 'timezone']
    for (const key of requiredTop) {
      if (typeof body[key] === 'undefined') {
        return NextResponse.json(
          { statusCode: 400, error: `Missing required field: ${key}` },
          { status: 400 }
        )
      }
    }

    // Ensure config object with defaults if omitted
    const config = {
      observation_point: body?.config?.observation_point || 'topocentric',
      ayanamsha: body?.config?.ayanamsha || 'lahiri',
      lunar_month_definition: body?.config?.lunar_month_definition || 'amanta',
    }

    const payload = {
      year: body.year,
      month: body.month,
      date: body.date,
      hours: body.hours,
      minutes: body.minutes,
      seconds: body.seconds,
      latitude: body.latitude,
      longitude: body.longitude,
      timezone: body.timezone,
      config,
    }

    // Call upstream FreeAstrology API via our helper
    const result = await astrologyAPI.getSingleCalculation('samvatinfo', payload)

    // Match requested output format: pass through upstream 'output' as-is
    // Upstream typically returns { statusCode: 200, output: "<json-string>" }
    // We only wrap with our own statusCode and forward the inner 'output'
    return NextResponse.json({ statusCode: 200, output: result?.output ?? result })
  } catch (err) {
    const message = err?.message || 'Unexpected error'
    return NextResponse.json(
      { statusCode: 500, error: message },
      { status: 500 }
    )
  }
}
