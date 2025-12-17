/**
 * GuestUsageService
 * Tracks guest user usage (2 free questions per chatType)
 * Uses sessionStorage for client-side tracking
 */

const GUEST_USAGE_KEY_PREFIX = 'tgs:guest_usage:'
const FREE_QUESTIONS_LIMIT = 2

/**
 * Get usage key for a specific chatType
 */
function getUsageKey(chatType) {
  return `${GUEST_USAGE_KEY_PREFIX}${chatType}`
}

/**
 * Get guest usage count for a chatType
 * @param {string} chatType - 'prediction' or 'matchmaking'
 * @returns {number} Number of questions used
 */
export function getGuestUsage(chatType) {
  if (typeof window === 'undefined') {
    return 0
  }

  try {
    const key = getUsageKey(chatType)
    const stored = sessionStorage.getItem(key)
    if (!stored) {
      return 0
    }
    const data = JSON.parse(stored)
    return data.count || 0
  } catch (error) {
    console.error('Error getting guest usage:', error)
    return 0
  }
}

/**
 * Increment guest usage count for a chatType
 * @param {string} chatType - 'prediction' or 'matchmaking'
 * @returns {number} New usage count
 */
export function incrementGuestUsage(chatType) {
  if (typeof window === 'undefined') {
    return 0
  }

  try {
    const key = getUsageKey(chatType)
    const currentCount = getGuestUsage(chatType)
    const newCount = currentCount + 1
    const data = {
      count: newCount,
      updatedAt: new Date().toISOString()
    }
    sessionStorage.setItem(key, JSON.stringify(data))
    return newCount
  } catch (error) {
    console.error('Error incrementing guest usage:', error)
    return getGuestUsage(chatType)
  }
}

/**
 * Check if guest has remaining free questions
 * @param {string} chatType - 'prediction' or 'matchmaking'
 * @returns {boolean} True if guest can ask more questions
 */
export function canGuestAskQuestion(chatType) {
  const usage = getGuestUsage(chatType)
  return usage < FREE_QUESTIONS_LIMIT
}

/**
 * Get remaining free questions for guest
 * @param {string} chatType - 'prediction' or 'matchmaking'
 * @returns {number} Remaining questions
 */
export function getRemainingGuestQuestions(chatType) {
  const usage = getGuestUsage(chatType)
  return Math.max(0, FREE_QUESTIONS_LIMIT - usage)
}

/**
 * Reset guest usage for a chatType (useful for testing)
 * @param {string} chatType - 'prediction' or 'matchmaking'
 */
export function resetGuestUsage(chatType) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const key = getUsageKey(chatType)
    sessionStorage.removeItem(key)
  } catch (error) {
    console.error('Error resetting guest usage:', error)
  }
}

/**
 * Reset all guest usage (clears all chatType usage)
 */
export function resetAllGuestUsage() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(GUEST_USAGE_KEY_PREFIX)) {
        sessionStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Error resetting all guest usage:', error)
  }
}
