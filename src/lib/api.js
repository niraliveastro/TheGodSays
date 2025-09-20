const API_BASE_URL = 'https://json.freeastrologyapi.com'
const API_KEY = '9ORk2PjfCu7PEINoF5spv1ytb291KxkY7ReqfVCP'

const API_ENDPOINTS = {
  'tithi-timings': 'tithi-timings',
  'nakshatra-timings': 'nakshatra-timings',
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
  }
}

// Export both for backward compatibility
export const choghadiyaAPI = astrologyAPI
export default astrologyAPI