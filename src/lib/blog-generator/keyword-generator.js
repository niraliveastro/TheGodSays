/**
 * Blog Keyword Generator
 * Generates keyword combinations for astrology blog topics
 * 
 * Dimensions:
 * - Zodiac Sign (12 signs)
 * - Topic (Career, Love, Health, Finance, Marriage)
 * - Time (Yearly, Monthly, Month+Year)
 */

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

export const TOPICS = [
  'Career',
  'Love',
  'Health',
  'Finance',
  'Marriage'
]

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/**
 * Generate all possible keyword combinations for a given year
 * @param {number} year - The year (e.g., 2026)
 * @returns {Array<Object>} Array of keyword objects with title, slug, and metadata
 */
export function generateYearlyKeywords(year) {
  const keywords = []
  
  // Yearly blogs: "Career for Leo in 2026"
  for (const sign of ZODIAC_SIGNS) {
    for (const topic of TOPICS) {
      keywords.push({
        title: `${topic} for ${sign} in ${year}`,
        slug: `${topic.toLowerCase()}-for-${sign.toLowerCase()}-in-${year}`,
        zodiac: sign,
        topic: topic,
        timeType: 'yearly',
        year: year,
        month: null,
      })
    }
  }
  
  return keywords
}

/**
 * Generate monthly keywords for a specific month and year
 * @param {string} month - Month name (e.g., "February")
 * @param {number} year - The year (e.g., 2026)
 * @returns {Array<Object>} Array of keyword objects
 */
export function generateMonthlyKeywords(month, year) {
  const keywords = []
  
  // Monthly blogs: "Career for Leo in February 2026"
  for (const sign of ZODIAC_SIGNS) {
    for (const topic of TOPICS) {
      keywords.push({
        title: `${topic} for ${sign} in ${month} ${year}`,
        slug: `${topic.toLowerCase()}-for-${sign.toLowerCase()}-in-${month.toLowerCase()}-${year}`,
        zodiac: sign,
        topic: topic,
        timeType: 'monthly',
        year: year,
        month: month,
      })
    }
  }
  
  return keywords
}

/**
 * Generate keywords for "this year" (current year)
 * @param {number} currentYear - Current year
 * @returns {Array<Object>} Array of keyword objects
 */
export function generateThisYearKeywords(currentYear) {
  const keywords = []
  
  // "Career for Leo this year"
  for (const sign of ZODIAC_SIGNS) {
    for (const topic of TOPICS) {
      keywords.push({
        title: `${topic} for ${sign} this year`,
        slug: `${topic.toLowerCase()}-for-${sign.toLowerCase()}-this-year`,
        zodiac: sign,
        topic: topic,
        timeType: 'this-year',
        year: currentYear,
        month: null,
      })
    }
  }
  
  return keywords
}

/**
 * Generate keywords for upcoming months
 * @param {number} currentYear - Current year
 * @param {number} monthsAhead - Number of months ahead to generate (default: 3)
 * @returns {Array<Object>} Array of keyword objects
 */
export function generateUpcomingMonthlyKeywords(currentYear, monthsAhead = 3) {
  const keywords = []
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  
  for (let i = 1; i <= monthsAhead; i++) {
    const targetMonthIndex = (currentMonth + i) % 12
    const targetMonth = MONTHS[targetMonthIndex]
    const targetYear = currentMonth + i >= 12 ? currentYear + 1 : currentYear
    
    keywords.push(...generateMonthlyKeywords(targetMonth, targetYear))
  }
  
  return keywords
}

/**
 * Get keywords that should be generated based on configuration
 * @param {Object} config - Configuration object
 * @param {number} config.currentYear - Current year
 * @param {number} config.monthsAhead - Months ahead to generate
 * @param {boolean} config.includeYearly - Include yearly blogs
 * @param {boolean} config.includeMonthly - Include monthly blogs
 * @param {boolean} config.includeThisYear - Include "this year" blogs
 * @returns {Array<Object>} Array of keyword objects
 */
export function generateKeywords(config) {
  const {
    currentYear = new Date().getFullYear(),
    monthsAhead = 3,
    includeYearly = true,
    includeMonthly = true,
    includeThisYear = true,
  } = config
  
  let keywords = []
  
  if (includeYearly) {
    keywords.push(...generateYearlyKeywords(currentYear))
  }
  
  if (includeMonthly) {
    keywords.push(...generateUpcomingMonthlyKeywords(currentYear, monthsAhead))
  }
  
  if (includeThisYear) {
    keywords.push(...generateThisYearKeywords(currentYear))
  }
  
  return keywords
}

/**
 * Filter out keywords that already exist as blogs
 * @param {Array<Object>} keywords - Array of keyword objects
 * @param {Array<string>} existingSlugs - Array of existing blog slugs
 * @returns {Array<Object>} Filtered keywords
 */
export function filterExistingKeywords(keywords, existingSlugs) {
  return keywords.filter(keyword => !existingSlugs.includes(keyword.slug))
}
