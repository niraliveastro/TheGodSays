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
  'planets', 'planets/extended', 'shadbala/summary', 'vimsottari/maha-dasas', 'vimsottari/dasa-information',
  'vimsottari/maha-dasas-and-antar-dasas', 'western/natal-wheel-chart', 'horoscope-chart-svg-code'
]

export async function POST(request, { params }) {
  try {
    // For [...endpoint], params.endpoint is an array of path segments
    const endpointArray = (await params)?.endpoint || []
    const endpointPath = Array.isArray(endpointArray) ? endpointArray.join('/') : endpointArray
    
    console.log('[DEBUG] Received endpoint array:', endpointArray, 'Combined path:', endpointPath)
    
    // Validate endpoint
    if (!endpointPath || !ALLOWED_ENDPOINTS.includes(endpointPath)) {
      console.log('[DEBUG] Invalid endpoint. Received:', endpointPath, 'Allowed:', ALLOWED_ENDPOINTS)
      return NextResponse.json({ error: `Invalid endpoint: ${endpointPath}` }, { status: 400 })
    }

    // Validate environment
    if (!API_BASE_URL || !API_KEY) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const payload = await request.json()
    console.log('[DEBUG] Received payload:', payload)
    
    // Validate required fields
    validateRequired(payload, ['year', 'month', 'date', 'hours', 'minutes', 'latitude', 'longitude'])
    
    // Validate data types and ranges
    validateDate(payload.year, payload.month, payload.date)
    validateTime(payload.hours, payload.minutes, payload.seconds || 0)
    validateCoordinates(payload.latitude, payload.longitude)

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
      console.log('[DEBUG] Upstream error:', res.status, errorText)
      return NextResponse.json({ error: `External API error: ${errorText || res.status}` }, { status: res.status })
    }

    const text = await res.text()
    try {
      const json = JSON.parse(text)
      console.log('[DEBUG] Success response for', endpointPath, '- keys:', Object.keys(json))
      return NextResponse.json(json, { status: res.status })
    } catch {
      return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
    }
  } catch (err) {
    console.error('Astro API error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Invalid request' }, { status: 400 })
  }
}
