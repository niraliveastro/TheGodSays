import { NextResponse } from 'next/server'

const API_BASE_URL = process.env.ASTRO_API_BASE_URL || ''
const API_KEY = process.env.ASTRO_API_KEY || ''

export async function POST(request, ctx) {
  try {
    const segs = (await ctx?.params)?.endpoint
    if (!segs || !Array.isArray(segs) || segs.length === 0) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }
    const endpointPath = segs.map(String).join('/')
    const payload = await request.json()

    const res = await fetch(`${API_BASE_URL}/${endpointPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, { status: res.status })
    } catch {
      return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
    }
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Proxy error' }, { status: 500 })
  }
}
