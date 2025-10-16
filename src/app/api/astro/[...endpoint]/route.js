import { NextResponse } from 'next/server'
import { validateRequired, validateCoordinates, validateDate, validateTime } from '@/lib/validation'

const API_BASE_URL = process.env.ASTRO_API_BASE_URL
const API_KEY = process.env.ASTRO_API_KEY

const ALLOWED_ENDPOINTS = [
  'vimsottari/maha-dasas', 'vimsottari/dasa-information', 'vimsottari/maha-dasas-and-antar-dasas'
]

export async function POST(request, ctx) {
  try {
    const segs = (await ctx?.params)?.endpoint
    if (!segs || !Array.isArray(segs) || segs.length === 0) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }
    
    const endpointPath = segs.map(String).join('/')
    
    // Validate endpoint
    if (!ALLOWED_ENDPOINTS.includes(endpointPath)) {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    }

    if (!API_BASE_URL || !API_KEY) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const payload = await request.json()
    
    // Validate required fields
    validateRequired(payload, ['year', 'month', 'date', 'hours', 'minutes', 'latitude', 'longitude'])
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
