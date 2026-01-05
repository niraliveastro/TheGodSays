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
 * GET /api/appointments
 * Get appointments for a user or astrologer
 * Query params: userId, astrologerId, status
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const astrologerId = searchParams.get('astrologerId')
    const status = searchParams.get('status')

    if (!userId && !astrologerId) {
      return NextResponse.json(
        { success: false, error: 'userId or astrologerId is required' },
        { status: 400 }
      )
    }

    const db = getFirestore()
    const appointmentsRef = db.collection('appointments')
    let query = appointmentsRef

    if (userId) {
      query = query.where('userId', '==', userId)
    }
    if (astrologerId) {
      query = query.where('astrologerId', '==', astrologerId)
    }
    if (status) {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.orderBy('date', 'desc').orderBy('time', 'desc').get()
    const appointments = []

    snapshot.forEach(doc => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      })
    })

    return NextResponse.json({
      success: true,
      appointments
    })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch appointments', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/appointments
 * Update appointment status
 * Body: { appointmentId, status, userId (for authorization) }
 */
export async function PUT(request) {
  try {
    const body = await request.json()
    const { appointmentId, status, userId, astrologerId } = body

    if (!appointmentId || !status) {
      return NextResponse.json(
        { success: false, error: 'appointmentId and status are required' },
        { status: 400 }
      )
    }

    const validStatuses = ['confirmed', 'cancelled', 'completed', 'pending']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const db = getFirestore()
    const appointmentRef = db.collection('appointments').doc(appointmentId)
    const appointmentDoc = await appointmentRef.get()

    if (!appointmentDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      )
    }

    const appointmentData = appointmentDoc.data()

    // Verify authorization
    if (userId && appointmentData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }
    if (astrologerId && appointmentData.astrologerId !== astrologerId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await appointmentRef.update({
      status,
      updatedAt: new Date()
    })

    // Send WhatsApp notification if cancelled
    if (status === 'cancelled') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/whatsapp/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'appointment_cancelled',
            appointmentId,
            userId: appointmentData.userId,
            astrologerId: appointmentData.astrologerId,
            date: appointmentData.date,
            time: appointmentData.time,
            userPhone: appointmentData.userPhone,
            astrologerPhone: appointmentData.astrologerPhone,
            userName: appointmentData.userName,
            astrologerName: appointmentData.astrologerName
          })
        }).catch(err => console.error('WhatsApp notification error:', err))
      } catch (error) {
        console.error('Error sending WhatsApp notification:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment updated successfully'
    })
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update appointment', message: error.message },
      { status: 500 }
    )
  }
}

