// app/api/astro/[...endpoint]/route.js

import { NextResponse } from 'next/server'
import { validateRequired, validateCoordinates, validateDate, validateTime } from '@/lib/validation'

const API_BASE_URL = process.env.ASTRO_API_BASE_URL
const API_KEY = process.env.ASTRO_API_KEY

const ALLOWED_ENDPOINTS = [
  'vimsottari/maha-dasas',
  'vimsottari/dasa-information',
  'vimsottari/maha-dasas-and-antar-dasas',
  'shadbala/summary',
  'western/natal-wheel-chart',
  'planets',
]

export async function POST(request, ctx) {
  try {
    // Await params — this is the fix
    const params = await ctx?.params
    const segs = params?.endpoint

    if (!segs || !Array.isArray(segs) || segs.length === 0) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }

    const endpointPath = segs.join('/')

    if (!ALLOWED_ENDPOINTS.includes(endpointPath)) {
      console.error('Invalid endpoint:', endpointPath)
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    }

    if (!API_BASE_URL || !API_KEY) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const payload = await request.json()

    validateRequired(payload, ['year', 'month', 'date', 'hours', 'minutes', 'latitude', 'longitude'])
    validateDate(payload.year, payload.month, payload.date)
    validateTime(payload.hours, payload.minutes, payload.seconds ?? 0)
    validateCoordinates(payload.latitude, payload.longitude)

    console.log(`[API] → ${endpointPath}`)

    const res = await fetch(`${API_BASE_URL}/${endpointPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`External API error [${endpointPath}]:`, res.status, errorText)
      return NextResponse.json(
        { error: 'External API error', details: errorText },
        { status: res.status }
      )
    }

    const text = await res.text()

    try {
      const json = JSON.parse(text)
      return NextResponse.json(json)
    } catch {
      return new NextResponse(text, {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' },
      })
    }
  } catch (err) {
    console.error('Route error:', err)
    return NextResponse.json(
      { error: 'Invalid request', details: err.message },
      { status: 400 }
    )
  }
}