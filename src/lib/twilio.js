import twilio from 'twilio'

/**
 * Twilio Service
 * Handles SMS (OTP) and WhatsApp messaging via Twilio
 */

// Initialize Twilio client
let twilioClient = null

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.')
    }

    twilioClient = twilio(accountSid, authToken)
  }

  return twilioClient
}

/**
 * Format phone number for Twilio
 * Ensures phone number is in E.164 format (e.g., +919876543210)
 */
export function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '')
  
  // If it doesn't start with +, assume it's an Indian number and add +91
  if (!cleaned.startsWith('+')) {
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }
    // Add +91 for India if it's a 10-digit number
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = '+' + cleaned
    } else {
      // For other countries, try to add + if missing
      cleaned = '+' + cleaned
    }
  }

  return cleaned
}

/**
 * Send SMS via Twilio
 * @param {string} to - Recipient phone number
 * @param {string} message - Message body
 * @returns {Promise<Object>} Twilio message object
 */
export async function sendSMS(to, message) {
  try {
    const client = getTwilioClient()
    const from = process.env.TWILIO_PHONE_NUMBER

    if (!from) {
      throw new Error('TWILIO_PHONE_NUMBER environment variable is not set')
    }

    const formattedTo = formatPhoneNumber(to)
    const formattedFrom = formatPhoneNumber(from)

    console.log(`📤 Sending SMS via Twilio:`, {
      from: formattedFrom,
      to: formattedTo,
      messageLength: message.length
    })

    const result = await client.messages.create({
      body: message,
      from: formattedFrom,
      to: formattedTo
    })

    console.log(`✅ SMS sent successfully:`, {
      messageSid: result.sid,
      status: result.status,
      to: formattedTo
    })

    return {
      success: true,
      messageSid: result.sid,
      status: result.status
    }
  } catch (error) {
    console.error('❌ Twilio SMS Error:', {
      code: error.code,
      message: error.message,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER
    })
    
    // Handle specific Twilio error codes
    if (error.code === 21660) {
      throw new Error(`The phone number ${process.env.TWILIO_PHONE_NUMBER} is not associated with your Twilio account. Please purchase a phone number for SMS or use a number that belongs to your account. Error code: 21660`)
    } else if (error.code === 21211) {
      throw new Error(`Invalid phone number format: ${to}. Please check the phone number.`)
    } else if (error.code === 21408) {
      throw new Error(`Permission denied. The phone number ${process.env.TWILIO_PHONE_NUMBER} may not have SMS capabilities.`)
    }
    
    throw new Error(`Failed to send SMS: ${error.message} (Code: ${error.code || 'unknown'})`)
  }
}

/**
 * Send WhatsApp message via Twilio
 * @param {string} to - Recipient phone number (WhatsApp format)
 * @param {string} message - Message body
 * @returns {Promise<Object>} Twilio message object
 */
export async function sendWhatsApp(to, message) {
  try {
    const client = getTwilioClient()
    const from = process.env.TWILIO_WHATSAPP_NUMBER

    if (!from) {
      throw new Error('TWILIO_WHATSAPP_NUMBER environment variable is not set')
    }

    // Format phone number for WhatsApp
    const formattedTo = formatPhoneNumber(to)
    
    // Ensure 'whatsapp:' prefix
    const whatsappTo = formattedTo.startsWith('whatsapp:') 
      ? formattedTo 
      : `whatsapp:${formattedTo}`
    
    const whatsappFrom = from.startsWith('whatsapp:') 
      ? from 
      : `whatsapp:${from}`

    const result = await client.messages.create({
      body: message,
      from: whatsappFrom,
      to: whatsappTo
    })

    return {
      success: true,
      messageSid: result.sid,
      status: result.status
    }
  } catch (error) {
    console.error('Twilio WhatsApp Error:', error)
    
    // Handle specific Twilio error codes
    if (error.code === 21660) {
      throw new Error(`The WhatsApp number ${whatsappFrom} is not associated with your Twilio account. Please set up WhatsApp Sandbox or use a verified WhatsApp Business number. Error code: 21660`)
    } else if (error.code === 21211) {
      throw new Error(`Invalid phone number format: ${whatsappTo}. Please check the phone number.`)
    } else if (error.code === 21608) {
      throw new Error(`The recipient ${whatsappTo} has not opted in to receive WhatsApp messages. They need to join the WhatsApp sandbox first.`)
    }
    
    throw new Error(`Failed to send WhatsApp message: ${error.message} (Code: ${error.code || 'unknown'})`)
  }
}

/**
 * Send OTP via SMS
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<Object>} Result object
 */
export async function sendOTP(phoneNumber, otp) {
  const message = `Your OTP for TheGodSays is ${otp}. Valid for 10 minutes. Do not share this code with anyone.`
  
  // Always try to send via SMS - no dev mode fallback
  // Only log to console if Twilio is completely not configured
  try {
    const result = await sendSMS(phoneNumber, message)
    console.log(`✅ SMS sent successfully to ${phoneNumber} via Twilio`)
    return result
  } catch (error) {
    // Check if Twilio is not configured at all
    const isNotConfigured = error.message?.includes('not configured') || 
                           error.message?.includes('TWILIO_ACCOUNT_SID') ||
                           error.message?.includes('TWILIO_AUTH_TOKEN')
    
    if (isNotConfigured && process.env.NODE_ENV === 'development') {
      // Only log if Twilio is not configured at all
      console.warn(`⚠️ Twilio not configured. OTP for ${phoneNumber}: ${otp}`)
      console.warn(`⚠️ Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to send SMS`)
      return {
        success: true,
        messageSid: 'dev-mode',
        status: 'queued',
        devMode: true
      }
    }
    
    // For all other errors (including configured but failed), throw error
    console.error(`❌ Failed to send SMS via Twilio:`, error.message)
    throw error
  }
}

