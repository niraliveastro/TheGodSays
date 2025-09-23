const API_BASE_URL = 'https://json.freeastrologyapi.com'
// const API_KEY = '9ORk2PjfCu7PEINoF5spv1ytb291KxkY7ReqfVCP'
// const API_KEY = 'dB1NJ3uudt6sVFA8amcXW8SjlzjXXn3l99W7XYES'
// const API_KEY = 'hARFI2eGxQ3y0s1i3ru6H1EnqNbJ868LqRQsNa0c'
const API_KEY =  'PvlAjHjTqB1AqCDl21SZK3aaOsNpyzA593wIlyVs'

const API_ENDPOINTS = {
  'tithi-timings': 'tithi-timings',
  'tithi-durations': 'tithi-durations',
  'nakshatra-timings': 'nakshatra-timings',
  'nakshatra-durations': 'nakshatra-durations',
  'yoga-durations': 'yoga-durations',
  'karana-timings': 'karana-timings',
  'vedic-weekday': 'vedic-weekday',
  'lunar-month-info': 'lunar-month-info',
  'ritu-information': 'ritu-information',
  'samvat-information': 'samvat-information',
  'aayanam': 'aayanam',
  'hora-timings': 'hora-timings',
  'choghadiya-timings': 'choghadiya-timings',
  'abhijit-muhurat': 'abhijit-muhurat',
  'amrit-kaal': 'amrit-kaal',
  'brahma-muhurat': 'brahma-muhurat',
  'rahu-kalam': 'rahu-kalam',
  'yama-gandam': 'yama-gandam',
  'gulika-kalam': 'gulika-kalam',
  'dur-muhurat': 'dur-muhurat',
  'varjyam': 'varjyam',
  'good-bad-times': 'good-bad-times'
}

export const astrologyAPI = {
  async getSingleCalculation(optionId, payload) {
    try {
      const endpoint = API_ENDPOINTS[optionId]
      if (!endpoint) {
        throw new Error(`Unknown option: ${optionId}`)
      }

      // Debug: log outgoing request
      try {
        console.log(`[API] → POST ${API_BASE_URL}/${endpoint}`, payload)
      } catch (_) {}

      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      // Debug: log success response (trim if huge)
      try {
        const preview = typeof data === 'string' ? data.slice(0, 300) : data
        console.log(`[API] ← OK ${endpoint}`, preview)
      } catch (_) {}
      return data
    } catch (error) {
      console.error(`Error fetching ${optionId}:`, error)
      throw error
    }
  },

  async getMultipleCalculations(optionIds, payload) {
    const results = {}
    const errors = {}

    // Process requests in parallel with a small delay to avoid rate limiting
    const promises = optionIds.map(async (optionId, index) => {
      // Add small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, index * 100))
      
      try {
        const result = await this.getSingleCalculation(optionId, payload)
        results[optionId] = result
      } catch (error) {
        errors[optionId] = error.message
      }
    })

    await Promise.all(promises)

    return { results, errors }
  },

  // Legacy method for backward compatibility
  async getTimings(payload) {
    return this.getSingleCalculation('choghadiya-timings', payload)
  },

  // Method to fetch sun/moon data from IPGeolocation API
  async getSunMoonData(latitude, longitude, date) {
    try {
      const apiKey = 'ba3a23a8741a476aa204a863a77a2924'
      const elevation = 10 // Default elevation
      
      // Format date as YYYY-MM-DD
      const formattedDate = date instanceof Date ? date.toISOString().split('T')[0] : date
      
      const url = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${apiKey}&lat=${latitude}&long=${longitude}&elevation=${elevation}&date=${formattedDate}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching sun/moon data:', error)
      throw error
    }
  },

  // Method to fetch Panchang data for home page
  async getPanchangData(payload) {
    const panchangEndpoints = [
      'tithi-durations', 
      'nakshatra-durations', 
      'yoga-durations', 
      'karana-timings'
    ]
    const results = {}
    const errors = {}

    // Process requests in parallel with a small delay to avoid rate limiting
    const promises = panchangEndpoints.map(async (endpoint, index) => {
      // Add small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, index * 200))
      
      try {
        const result = await this.getSingleCalculation(endpoint, payload)
        results[endpoint] = result
      } catch (error) {
        errors[endpoint] = error.message
        console.warn(`Failed to fetch ${endpoint}:`, error.message)
      }
    })

    await Promise.all(promises)

    return { results, errors }
  },

  // Method to fetch Auspicious/Inauspicious timings used on the Home page
  async getAuspiciousData(payload) {
    const endpoints = [
      'rahu-kalam',
      'yama-gandam',
      'gulika-kalam',
      'abhijit-muhurat',
      'amrit-kaal',
      'brahma-muhurat',
      'dur-muhurat',
      'varjyam',
      'good-bad-times',
    ]

    const results = {}
    const errors = {}

    const promises = endpoints.map(async (endpoint, index) => {
      // slight staggering to be kind to rate limits
      await new Promise((r) => setTimeout(r, index * 120))
      try {
        const result = await this.getSingleCalculation(endpoint, payload)
        results[endpoint] = result
      } catch (error) {
        errors[endpoint] = error.message
        console.warn(`Failed to fetch ${endpoint}:`, error.message)
      }
    })

    await Promise.all(promises)
    return { results, errors }
  }
}

// Export both for backward compatibility
export const choghadiyaAPI = astrologyAPI
export default astrologyAPI