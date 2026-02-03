/**
 * Custom OTP Service
 * Production-ready OTP system using Twilio (cost-effective alternative to Firebase SMS)
 * 
 * Cost Comparison:
 * - Firebase SMS: ~$0.01-0.05 per SMS (varies by country)
 * - Twilio SMS: ~$0.0075 per SMS (US) or ~₹0.50 per SMS (India)
 * - Savings: ~25-50% cheaper than Firebase
 */

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - Phone number with country code
 * @param {string} userId - User ID (can be temp ID for new users)
 * @param {string} userType - 'user' or 'astrologer'
 * @returns {Promise<{success: boolean, message?: string, otp?: string, error?: string, tempUserId?: string}>}
 */
export async function sendOTP(phoneNumber, userId = null, userType = 'user') {
  try {
    // Generate temp userId if not provided (for new users during signup/login)
    const finalUserId = userId || ('temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9))
    
    const response = await fetch('/api/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        userId: finalUserId,
        userType
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send OTP')
    }

    // Return userId so it can be used for verification
    return { ...data, tempUserId: finalUserId }
  } catch (error) {
    console.error('Error sending OTP:', error)
    throw error
  }
}

/**
 * Verify OTP code
 * @param {string} phoneNumber - Phone number
 * @param {string} otp - 6-digit OTP code
 * @param {string} userId - User ID (must match the one used when sending OTP)
 * @param {string} userType - 'user' or 'astrologer'
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function verifyOTP(phoneNumber, otp, userId, userType = 'user') {
  try {
    if (!userId) {
      throw new Error('User ID is required for OTP verification')
    }

    const response = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        otp,
        userId,
        userType
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify OTP')
    }

    return data
  } catch (error) {
    console.error('Error verifying OTP:', error)
    throw error
  }
}

/**
 * Format phone number for display
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number
 */
export function formatPhoneDisplay(phoneNumber) {
  if (!phoneNumber) return ''
  
  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '')
  
  // Format based on country code
  if (cleaned.startsWith('+91')) {
    // India: +91 XXXXX XXXXX
    const number = cleaned.substring(3)
    if (number.length === 10) {
      return `+91 ${number.substring(0, 5)} ${number.substring(5)}`
    }
  } else if (cleaned.startsWith('+1')) {
    // US: +1 (XXX) XXX-XXXX
    const number = cleaned.substring(2)
    if (number.length === 10) {
      return `+1 (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`
    }
  }
  
  return cleaned
}

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid
 */
export function validatePhoneNumber(phoneNumber) {
  if (!phoneNumber) return false
  
  // Remove spaces and special chars except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '')
  
  // Must start with + and have at least 10 digits
  if (!cleaned.startsWith('+')) return false
  if (cleaned.length < 11) return false // +country code + number
  
  // Basic regex for international format
  const phoneRegex = /^\+[1-9]\d{1,14}$/
  return phoneRegex.test(cleaned)
}
