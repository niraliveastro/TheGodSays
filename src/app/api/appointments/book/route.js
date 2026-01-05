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
 * POST /api/appointments/book
 * Book an appointment
 * Body: { userId, astrologerId, date, time, duration, notes }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, astrologerId, date, time, duration, notes } = body

    // Validate input
    if (!userId || !astrologerId || !date || !time || !duration) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, astrologerId, date, time, duration' },
        { status: 400 }
      )
    }

    // Validate date and time format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(time)) {
      return NextResponse.json(
        { success: false, error: 'Invalid time format. Use HH:MM (24-hour format)' },
        { status: 400 }
      )
    }

    // Check if slot is in the past
    const slotDate = new Date(date)
    const [hours, minutes] = time.split(':').map(Number)
    const slotDateTime = new Date(slotDate)
    slotDateTime.setHours(hours, minutes, 0, 0)
    if (slotDateTime <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Cannot book appointments in the past' },
        { status: 400 }
      )
    }

    const db = getFirestore()

    // Verify astrologer exists
    const astrologerRef = db.collection('astrologers').doc(astrologerId)
    const astrologerDoc = await astrologerRef.get()
    if (!astrologerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Astrologer not found' },
        { status: 404 }
      )
    }

    // Verify user exists
    const userRef = db.collection('users').doc(userId)
    const userDoc = await userRef.get()
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has verified phone number
    const userData = userDoc.data()
    if (!userData.phoneVerified) {
      return NextResponse.json(
        { success: false, error: 'Please verify your phone number before booking an appointment' },
        { status: 400 }
      )
    }

    // Check if astrologer has verified phone number
    const astrologerData = astrologerDoc.data()
    if (!astrologerData.phoneVerified) {
      return NextResponse.json(
        { success: false, error: 'Astrologer has not verified their phone number' },
        { status: 400 }
      )
    }

    // Check if slot is available
    const availabilityRef = db.collection('appointment_availability').doc(astrologerId)
    const availabilityDoc = await availabilityRef.get()
    
    if (!availabilityDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'No availability slots found for this astrologer' },
        { status: 404 }
      )
    }

    const availability = availabilityDoc.data()
    const slots = availability.slots || []
    const slotKey = `${date}_${time}`
    const availableSlot = slots.find(slot => `${slot.date}_${slot.time}` === slotKey)

    if (!availableSlot) {
      return NextResponse.json(
        { success: false, error: 'Selected slot is not available' },
        { status: 400 }
      )
    }

    // Check if slot is already booked
    const appointmentsRef = db.collection('appointments')
    const existingAppointments = await appointmentsRef
      .where('astrologerId', '==', astrologerId)
      .where('date', '==', date)
      .where('time', '==', time)
      .where('status', 'in', ['confirmed', 'pending'])
      .get()

    if (!existingAppointments.empty) {
      return NextResponse.json(
        { success: false, error: 'This slot is already booked' },
        { status: 400 }
      )
    }

    // Create appointment
    const appointmentRef = appointmentsRef.doc()
    const appointmentId = appointmentRef.id

    const appointmentData = {
      id: appointmentId,
      userId,
      astrologerId,
      date,
      time,
      duration: duration || availableSlot.duration,
      status: 'confirmed',
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      userPhone: userData.phoneNumber,
      astrologerPhone: astrologerData.phoneNumber,
      userName: userData.name || userData.displayName || 'User',
      astrologerName: astrologerData.name || 'Astrologer'
    }

    await appointmentRef.set(appointmentData)

    // Send WhatsApp notifications (async, don't wait for it)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/whatsapp/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'appointment_confirmed',
          appointmentId,
          userId,
          astrologerId,
          date,
          time,
          userPhone: userData.phoneNumber,
          astrologerPhone: astrologerData.phoneNumber,
          userName: userData.name || userData.displayName || 'User',
          astrologerName: astrologerData.name || 'Astrologer'
        })
      }).catch(err => console.error('WhatsApp notification error:', err))
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error)
      // Don't fail the booking if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: appointmentData
    })
  } catch (error) {
    console.error('Error booking appointment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to book appointment', message: error.message },
      { status: 500 }
    )
  }
}

