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
  'planets', 'shadbala/summary', 'vimsottari/maha-dasas', 'vimsottari/dasa-information',
  'vimsottari/maha-dasas-and-antar-dasas'
]

export async function POST(request, { params }) {
  try {
    const { endpoint } = await params || {}
    
    // Validate endpoint
    if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    }

    // Validate environment
    if (!API_BASE_URL || !API_KEY) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const payload = await request.json()
    
    // Validate required fields
    validateRequired(payload, ['year', 'month', 'date', 'hours', 'minutes', 'latitude', 'longitude'])
    
    // Validate data types and ranges
    validateDate(payload.year, payload.month, payload.date)
    validateTime(payload.hours, payload.minutes, payload.seconds || 0)
    validateCoordinates(payload.latitude, payload.longitude)

    const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'External API error' }, { status: res.status })
    }

    const text = await res.text()
    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, { status: res.status })
    } catch {
      return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
    }
  } catch (err) {
    console.error('Astro API error:', err.message)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
