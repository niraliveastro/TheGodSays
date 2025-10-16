import { NextResponse } from 'next/server'
import { validateRequired, validateCoordinates, validateDate, validateTime } from '@/lib/validation'
import astrologyAPI from '../../lib/api'

export async function POST(request) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredTop = ['year', 'month', 'date', 'hours', 'minutes', 'seconds', 'latitude', 'longitude', 'timezone']
    validateRequired(body, requiredTop)

    // Validate data types and ranges
    validateDate(body.year, body.month, body.date)
    validateTime(body.hours, body.minutes, body.seconds)
    validateCoordinates(body.latitude, body.longitude)

    // Validate timezone
    const timezone = parseFloat(body.timezone)
    if (isNaN(timezone) || timezone < -12 || timezone > 14) {
      throw new Error('Invalid timezone')
    }

    // Validate config object
    const validObservationPoints = ['topocentric', 'geocentric']
    const validAyanamshas = ['lahiri', 'sayana']
    const validLunarMonths = ['amanta', 'purnimanta']

    const config = {
      observation_point: validObservationPoints.includes(body?.config?.observation_point) 
        ? body.config.observation_point : 'topocentric',
      ayanamsha: validAyanamshas.includes(body?.config?.ayanamsha) 
        ? body.config.ayanamsha : 'lahiri',
      lunar_month_definition: validLunarMonths.includes(body?.config?.lunar_month_definition) 
        ? body.config.lunar_month_definition : 'amanta',
    }

    const payload = {
      year: parseInt(body.year),
      month: parseInt(body.month),
      date: parseInt(body.date),
      hours: parseInt(body.hours),
      minutes: parseInt(body.minutes),
      seconds: parseInt(body.seconds),
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
      timezone,
      config,
    }

    const result = await astrologyAPI.getSingleCalculation('samvat-information', payload)
    return NextResponse.json({ statusCode: 200, output: result?.output ?? result })
  } catch (err) {
    console.error('Samvatinfo API error:', err.message)
    return NextResponse.json(
      { statusCode: 400, error: 'Invalid request parameters' },
      { status: 400 }
    )
  }
}
