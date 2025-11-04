import { NextResponse } from 'next/server'
import { validateRequired, validateCoordinates, validateDate, validateTime } from '@/lib/validation'

const API_BASE_URL = process.env.ASTRO_API_BASE_URL
const API_KEY = process.env.ASTRO_API_KEY

if (!API_BASE_URL || !API_KEY) {
  console.error('Missing required environment variables: ASTRO_API_BASE_URL, ASTRO_API_KEY')
}

const ALLOWED_ENDPOINTS = [
  'tithi-timings', 'nakshatra-timings', 'yoga-durations', 'karana-timings',
  'hora-timings', 'choghadiya-timings', 'rahu-kalam', 'gulika-kalam',
  'planets', 'planets/extended', 'shadbala/summary',
  'vimsottari/maha-dasas', 'vimsottari/dasa-information',
  'vimsottari/maha-dasas-and-antar-dasas',
  'western/natal-wheel-chart', 'horoscope-chart-svg-code',
  'match-making/ashtakoot-score'
]

export async function POST(request, { params }) {
  try {
    // Properly read the endpoint param
    const endpointArray = params?.endpoint || []
    const endpointPath = Array.isArray(endpointArray) ? endpointArray.join('/') : endpointArray

    console.log('[DEBUG] Endpoint:', endpointPath)

    if (!endpointPath || !ALLOWED_ENDPOINTS.includes(endpointPath)) {
      return NextResponse.json({ error: `Invalid endpoint: ${endpointPath}` }, { status: 400 })
    }

    const payload = await request.json()
    console.log('[DEBUG] Payload:', payload)

    // CONDITIONAL VALIDATION
    if (endpointPath.startsWith('match-making/')) {
      if (!payload.female || !payload.male) {
        return NextResponse.json({ error: 'Missing female or male birth details' }, { status: 400 })
      }

      // Validate female
      validateRequired(payload.female, ['year', 'month', 'date', 'hours', 'minutes', 'latitude', 'longitude'])
      validateDate(payload.female.year, payload.female.month, payload.female.date)
      validateTime(payload.female.hours, payload.female.minutes, payload.female.seconds || 0)
      validateCoordinates(payload.female.latitude, payload.female.longitude)

      // Validate male
      validateRequired(payload.male, ['year', 'month', 'date', 'hours', 'minutes', 'latitude', 'longitude'])
      validateDate(payload.male.year, payload.male.month, payload.male.date)
      validateTime(payload.male.hours, payload.male.minutes, payload.male.seconds || 0)
      validateCoordinates(payload.male.latitude, payload.male.longitude)
    } else {
      // Default single-person validation
      validateRequired(payload, ['year', 'month', 'date', 'hours', 'minutes', 'latitude', 'longitude'])
      validateDate(payload.year, payload.month, payload.date)
      validateTime(payload.hours, payload.minutes, payload.seconds || 0)
      validateCoordinates(payload.latitude, payload.longitude)
    }

    // Forward the request to the astrology API
    const res = await fetch(`${API_BASE_URL}/${endpointPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      console.error('[DEBUG] Upstream error:', res.status, errorText)
      return NextResponse.json({ error: errorText || `External API error ${res.status}` }, { status: res.status })
    }

    const text = await res.text()
    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, { status: res.status })
    } catch {
      return new NextResponse(text, { status: res.status })
    }
  } catch (err) {
    console.error('Astro API route error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Invalid request' }, { status: 400 })
  }
}
