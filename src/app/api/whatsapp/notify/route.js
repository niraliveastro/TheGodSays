import { NextResponse } from 'next/server'
import { sendWhatsApp } from '@/lib/twilio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/whatsapp/notify
 * Send WhatsApp notification
 * Body: { type, appointmentId, userId, astrologerId, date, time, userPhone, astrologerPhone, userName, astrologerName }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      type, 
      appointmentId, 
      userId, 
      astrologerId, 
      date, 
      time, 
      userPhone, 
      astrologerPhone, 
      userName, 
      astrologerName 
    } = body

    if (!type || !appointmentId) {
      return NextResponse.json(
        { success: false, error: 'type and appointmentId are required' },
        { status: 400 }
      )
    }

    // Format date and time for display
    const appointmentDate = new Date(`${date}T${time}`)
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const formattedTime = appointmentDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    let userMessage = ''
    let astrologerMessage = ''

    if (type === 'appointment_confirmed') {
      userMessage = `🎉 Appointment Confirmed!

Hello ${userName},

Your appointment with ${astrologerName} has been confirmed.

📅 Date: ${formattedDate}
⏰ Time: ${formattedTime}

You will receive a connection link before your appointment time. Please ensure your phone number is verified.

Thank you for choosing TheGodSays!`

      astrologerMessage = `📞 New Appointment Booking!

Hello ${astrologerName},

You have a new appointment booking:

👤 Client: ${userName}
📅 Date: ${formattedDate}
⏰ Time: ${formattedTime}

Please mark your calendar and be available for the consultation.

Thank you!`

    } else if (type === 'appointment_cancelled') {
      userMessage = `❌ Appointment Cancelled

Hello ${userName},

Your appointment with ${astrologerName} scheduled for ${formattedDate} at ${formattedTime} has been cancelled.

If you need to reschedule, please book a new appointment.

Thank you!`

      astrologerMessage = `❌ Appointment Cancelled

Hello ${astrologerName},

The appointment with ${userName} scheduled for ${formattedDate} at ${formattedTime} has been cancelled.

Thank you!`
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid notification type' },
        { status: 400 }
      )
    }

    // Send WhatsApp messages via Twilio
    const results = []

    // Send to user
    if (userPhone && userMessage) {
      try {
        const whatsappResult = await sendWhatsApp(userPhone, userMessage)
        results.push({ 
          phone: userPhone, 
          status: 'sent', 
          type: 'user',
          messageSid: whatsappResult.messageSid,
          twilioStatus: whatsappResult.status
        })
      } catch (error) {
        console.error('Error sending WhatsApp to user:', error)
        
        // In development, log the message
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEV MODE] WhatsApp message to user (${userPhone}):`, userMessage)
          results.push({ 
            phone: userPhone, 
            status: 'sent', 
            type: 'user',
            devMode: true,
            warning: 'Twilio not configured, using dev mode'
          })
        } else {
          results.push({ 
            phone: userPhone, 
            status: 'failed', 
            type: 'user', 
            error: error.message 
          })
        }
      }
    }

    // Send to astrologer
    if (astrologerPhone && astrologerMessage) {
      try {
        const whatsappResult = await sendWhatsApp(astrologerPhone, astrologerMessage)
        results.push({ 
          phone: astrologerPhone, 
          status: 'sent', 
          type: 'astrologer',
          messageSid: whatsappResult.messageSid,
          twilioStatus: whatsappResult.status
        })
      } catch (error) {
        console.error('Error sending WhatsApp to astrologer:', error)
        
        // In development, log the message
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEV MODE] WhatsApp message to astrologer (${astrologerPhone}):`, astrologerMessage)
          results.push({ 
            phone: astrologerPhone, 
            status: 'sent', 
            type: 'astrologer',
            devMode: true,
            warning: 'Twilio not configured, using dev mode'
          })
        } else {
          results.push({ 
            phone: astrologerPhone, 
            status: 'failed', 
            type: 'astrologer', 
            error: error.message 
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp notifications sent',
      results
    })
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send WhatsApp notification', message: error.message },
      { status: 500 }
    )
  }
}

