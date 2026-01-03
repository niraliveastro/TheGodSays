import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

/**
 * GET /api/appointments/availability
 * Get availability for an astrologer
 * Query params: astrologerId
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const astrologerId = searchParams.get('astrologerId')

    if (!astrologerId) {
      return NextResponse.json(
        { success: false, error: 'astrologerId is required' },
        { status: 400 }
      )
    }

    const db = getFirestore()
    const availabilityRef = db.collection('appointment_availability').doc(astrologerId)
    const availabilityDoc = await availabilityRef.get()

    if (!availabilityDoc.exists) {
      return NextResponse.json({
        success: true,
        availability: []
      })
    }

    const data = availabilityDoc.data()
    const availability = data.slots || []

    // Filter out past slots
    const now = new Date()
    const futureSlots = availability.filter(slot => {
      const slotDate = new Date(slot.date)
      const slotTime = slot.time
      const [hours, minutes] = slotTime.split(':').map(Number)
      const slotDateTime = new Date(slotDate)
      slotDateTime.setHours(hours, minutes, 0, 0)
      return slotDateTime > now
    })

    return NextResponse.json({
      success: true,
      availability: futureSlots
    })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch availability', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/appointments/availability
 * Add or update availability for an astrologer
 * Body: { astrologerId, slots: [{ date, time, duration }] }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { astrologerId, slots } = body

    if (!astrologerId || !Array.isArray(slots)) {
      return NextResponse.json(
        { success: false, error: 'astrologerId and slots array are required' },
        { status: 400 }
      )
    }

    // Validate slots
    for (const slot of slots) {
      if (!slot.date || !slot.time || !slot.duration) {
        return NextResponse.json(
          { success: false, error: 'Each slot must have date, time, and duration' },
          { status: 400 }
        )
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(slot.date)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        )
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(slot.time)) {
        return NextResponse.json(
          { success: false, error: 'Invalid time format. Use HH:MM (24-hour format)' },
          { status: 400 }
        )
      }

      // Validate duration (in minutes, should be positive)
      if (typeof slot.duration !== 'number' || slot.duration <= 0) {
        return NextResponse.json(
          { success: false, error: 'Duration must be a positive number (in minutes)' },
          { status: 400 }
        )
      }

      // Check if slot is in the past
      const slotDate = new Date(slot.date)
      const [hours, minutes] = slot.time.split(':').map(Number)
      const slotDateTime = new Date(slotDate)
      slotDateTime.setHours(hours, minutes, 0, 0)
      if (slotDateTime <= new Date()) {
        return NextResponse.json(
          { success: false, error: 'Cannot add slots in the past' },
          { status: 400 }
        )
      }
    }

    const db = getFirestore()
    const availabilityRef = db.collection('appointment_availability').doc(astrologerId)
    const availabilityDoc = await availabilityRef.get()

    let existingSlots = []
    if (availabilityDoc.exists) {
      existingSlots = availabilityDoc.data().slots || []
    }

    // Merge slots (avoid duplicates based on date+time)
    const slotMap = new Map()
    existingSlots.forEach(slot => {
      const key = `${slot.date}_${slot.time}`
      slotMap.set(key, slot)
    })

    slots.forEach(slot => {
      const key = `${slot.date}_${slot.time}`
      slotMap.set(key, {
        ...slot,
        createdAt: new Date()
      })
    })

    const mergedSlots = Array.from(slotMap.values())

    // Sort slots by date and time
    mergedSlots.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`)
      const dateB = new Date(`${b.date}T${b.time}`)
      return dateA - dateB
    })

    await availabilityRef.set({
      astrologerId,
      slots: mergedSlots,
      updatedAt: new Date()
    }, { merge: true })

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully',
      slots: mergedSlots
    })
  } catch (error) {
    console.error('Error updating availability:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update availability', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/appointments/availability
 * Remove availability slots
 * Body: { astrologerId, slotIds: [slotId1, slotId2, ...] }
 */
export async function DELETE(request) {
  try {
    const body = await request.json()
    const { astrologerId, slotIds } = body

    if (!astrologerId || !Array.isArray(slotIds)) {
      return NextResponse.json(
        { success: false, error: 'astrologerId and slotIds array are required' },
        { status: 400 }
      )
    }

    const db = getFirestore()
    const availabilityRef = db.collection('appointment_availability').doc(astrologerId)
    const availabilityDoc = await availabilityRef.get()

    if (!availabilityDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'No availability found' },
        { status: 404 }
      )
    }

    const data = availabilityDoc.data()
    const slots = data.slots || []

    // Filter out slots to be deleted
    const remainingSlots = slots.filter(slot => {
      const slotKey = `${slot.date}_${slot.time}`
      return !slotIds.includes(slotKey)
    })

    await availabilityRef.update({
      slots: remainingSlots,
      updatedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      message: 'Slots removed successfully',
      slots: remainingSlots
    })
  } catch (error) {
    console.error('Error removing slots:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove slots', message: error.message },
      { status: 500 }
    )
  }
}

