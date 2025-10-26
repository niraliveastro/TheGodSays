import { NextResponse } from 'next/server'

const API_BASE_URL = process.env.ASTRO_API_BASE_URL
const API_KEY = process.env.ASTRO_API_KEY

if (!API_BASE_URL || !API_KEY) {
  console.error('Missing required environment variables: ASTRO_API_BASE_URL, ASTRO_API_KEY')
}

const ALLOWED_ENDPOINTS = [
  'tithi-timings', 'tithi-durations', 'nakshatra-timings', 'nakshatra-durations',
  'yoga-durations', 'karana-timings', 'hora-timings', 'choghadiya-timings',
  'rahu-kalam', 'gulika-kalam', 'yama-gandam', 'abhijit-muhurat',
  'amrit-kaal', 'brahma-muhurat', 'dur-muhurat', 'varjyam', 'good-bad-times',
  'planets', 'shadbala/summary', 'vimsottari/maha-dasas', 'vimsottari/dasa-information',
  'vimsottari/maha-dasas-and-antar-dasas', 'western/natal-wheel-chart', 'horoscope-chart-svg-code'
]

// Custom validation that handles optional fields properly
function validatePayload(payload) {
  const required = ['year', 'month', 'date', 'hours', 'minutes', 'latitude', 'longitude']
  const missing = required.filter(field => payload[field] === undefined || payload[field] === null)
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`)
  }

  // Validate year (1900-2100)
  if (payload.year < 1900 || payload.year > 2100) {
    throw new Error('Year must be between 1900 and 2100')
  }

  // Validate month (1-12)
  if (payload.month < 1 || payload.month > 12) {
    throw new Error('Month must be between 1 and 12')
  }

  // Validate date (1-31)
  if (payload.date < 1 || payload.date > 31) {
    throw new Error('Date must be between 1 and 31')
  }

  // Validate hours (0-23)
  if (payload.hours < 0 || payload.hours > 23) {
    throw new Error('Hours must be between 0 and 23')
  }

  // Validate minutes (0-59)
  if (payload.minutes < 0 || payload.minutes > 59) {
    throw new Error('Minutes must be between 0 and 59')
  }

  // Validate seconds if provided (0-59)
  if (payload.seconds !== undefined && (payload.seconds < 0 || payload.seconds > 59)) {
    throw new Error('Seconds must be between 0 and 59')
  }

  // Validate latitude (-90 to 90)
  if (payload.latitude < -90 || payload.latitude > 90) {
    throw new Error('Latitude must be between -90 and 90')
  }

  // Validate longitude (-180 to 180)
  if (payload.longitude < -180 || payload.longitude > 180) {
    throw new Error('Longitude must be between -180 and 180')
  }
}

export async function POST(request, { params }) {
  try {
    const { endpoint } = await params || {}
    
    // Validate endpoint
    if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
      console.error('Invalid endpoint requested:', endpoint)
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    }

    // Validate environment
    if (!API_BASE_URL || !API_KEY) {
      console.error('Service unavailable: Missing API configuration')
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const payload = await request.json()
    
    // Validate payload
    try {
      validatePayload(payload)
    } catch (validationError) {
      console.error('Validation error:', validationError.message)
      return NextResponse.json({ error: validationError.message }, { status: 400 })
    }

    // Forward the entire payload including config to the external API
    const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`External API error for ${endpoint}:`, res.status, errorText)
      return NextResponse.json({ 
        error: 'External API error',
        details: errorText 
      }, { status: res.status })
    }

    const text = await res.text()
    
    // Try to parse as JSON, but return raw text if it fails
    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, { status: 200 })
    } catch {
      // Some endpoints might return raw SVG or other non-JSON data
      return new NextResponse(text, { 
        status: 200, 
        headers: { 'Content-Type': res.headers.get('Content-Type') || 'text/plain' } 
      })
    }
  } catch (err) {
    console.error('Astro API error:', err.message)
    return NextResponse.json({ 
      error: 'Invalid request',
      details: err.message 
    }, { status: 400 })
  }
}