// Client-side config uses NEXT_PUBLIC_* variables. Server-side (API routes)
// should use server-only variables: ASTRO_API_BASE_URL and ASTRO_API_KEY.
const API_BASE_URL = typeof window === 'undefined'
  ? process.env.ASTRO_API_BASE_URL
  : process.env.NEXT_PUBLIC_ASTRO_API_BASE_URL

const API_KEY = typeof window === 'undefined'
  ? process.env.ASTRO_API_KEY
  : process.env.NEXT_PUBLIC_ASTRO_API_KEY

const API_ENDPOINTS = {
  'tithi-timings': 'tithi-timings',
  'tithi-durations': 'tithi-durations',
  'nakshatra-timings': 'nakshatra-timings',
  'nakshatra-durations': 'nakshatra-durations',
  'yoga-durations': 'yoga-durations',
  'karana-timings': 'karana-timings',
  'vedic-weekday': 'vedicweekday',
  'lunar-month-info': 'lunarmonthinfo',
  'ritu-information': 'rituinfo',
  'samvat-information': 'samvatinfo',
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
  'good-bad-times': 'good-bad-times',
  'horoscope-chart-svg-code': 'horoscope-chart-svg-code',
  // Added for Predictions page
  'planets': 'planets',
  'planets/extended': 'planets/extended',
  'western/natal-wheel-chart': 'western/natal-wheel-chart',
  'vimsottari/dasa-information': 'vimsottari/dasa-information',
  'shadbala/summary': 'shadbala/summary',
  'vimsottari/maha-dasas': 'vimsottari/maha-dasas',
  // New combined endpoint returning maha + antar lists grouped by maha
  'vimsottari/maha-dasas-and-antar-dasas': 'vimsottari/maha-dasas-and-antar-dasas'
  //match-making
  ,'match-making/ashtakoot-score': 'match-making/ashtakoot-score',
  'navamsa-chart-info': 'navamsa-chart-info',


}

async function parseErrorResponse(response) {
  const fallback = `HTTP error! status: ${response.status}`
  try {
    const text = await response.text()
    if (!text) return fallback

    try {
      const data = JSON.parse(text)
      if (data && typeof data === 'object') {
        return data.error || data.message || fallback
      }
      return text
    } catch {
      return text
    }
  } catch {
    return fallback
  }
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

      // Retry with exponential backoff on 429
      let lastErr
      const maxRetries = 4 // Increased from 3 to 4 for better resilience
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Use server proxy when running on the client to avoid CORS and hide API key
const isServer = typeof window === "undefined";
const url = isServer
  ? `${API_BASE_URL}/${endpoint}`
  : `/api/astro/${endpoint}`;

// Shared headers
const headers = {
  "Content-Type": "application/json",
  "X-Requested-With": "XMLHttpRequest",
};

// Server only: attach key
if (isServer) {
  headers["x-api-key"] = API_KEY;
}

const response = await fetch(url, {
  method: "POST",
  headers,
  body: JSON.stringify(payload),
});


        if (response.ok) {
          const data = await response.json()
          // Debug: log success response (trim if huge)
          try {
            const preview = typeof data === 'string' ? data.slice(0, 300) : data
            console.log(`[API] ← OK ${endpoint}`, preview)
          } catch (_) {}
          return data
        }

        // If 429, backoff and retry with longer delays
        if (response.status === 429 && attempt < maxRetries - 1) {
          const base = 1000 * Math.pow(2, attempt) // 1s, 2s, 4s, 8s
          const jitter = Math.floor(Math.random() * 500) // 0-500ms random jitter
          const delay = base + jitter
          console.log(`[API] Rate limit (429) for ${endpoint}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise(r => setTimeout(r, delay))
          continue
        }

        const errorMessage = await parseErrorResponse(response)

        // If 403, API key is invalid - throw specific error
        if (response.status === 403) {
          lastErr = new Error(errorMessage || 'API authentication failed (403). Using fallback data.')
          break
        }

        // For 500 errors, don't throw - return error info instead
        if (response.status >= 500) {
          lastErr = new Error(errorMessage || `Server error (${response.status}). The astrology API service may be temporarily unavailable.`)
          break
        }

        lastErr = new Error(errorMessage)
        break
      }

      if (lastErr) throw lastErr

      // Fallback throw if we somehow exit loop without return
      throw new Error('Request failed after retries')
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
      // Add small delay between requests to avoid rate limiting (more generous)
      await new Promise(resolve => setTimeout(resolve, index * 250))
      
      try {
        const result = await this.getSingleCalculation(optionId, payload)
        if (result !== null && result !== undefined) {
          results[optionId] = result
        } else {
          errors[optionId] = 'Received null or undefined response'
        }
      } catch (error) {
        errors[optionId] = error?.message || 'Unknown error occurred'
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
      // Move the IP Geolocation API key to an env var. For client usage,
      // set NEXT_PUBLIC_IPGEO_API_KEY; for server usage set IPGEO_API_KEY.
      const apiKey = typeof window === 'undefined'
        ? process.env.IPGEO_API_KEY
        : process.env.NEXT_PUBLIC_IPGEO_API_KEY

      const elevation = 10 // Default elevation
      // Format date as YYYY-MM-DD
      const formattedDate = date instanceof Date ? date.toISOString().split('T')[0] : date

      const url = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${encodeURIComponent(apiKey || '')}&lat=${latitude}&long=${longitude}&elevation=${elevation}&date=${formattedDate}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
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
      // Add small delay between requests to avoid rate limiting (more generous)
      await new Promise(resolve => setTimeout(resolve, index * 350))
      
      try {
        const result = await this.getSingleCalculation(endpoint, payload)
        results[endpoint] = result
      } catch (error) {
        errors[endpoint] = error.message
        // Only log warnings for non-500 errors to reduce noise
        if (!error.message.includes('500')) {
          console.warn(`Failed to fetch ${endpoint}:`, error.message)
        } else {
          console.log(`[API] ${endpoint} temporarily unavailable (500 error)`)
        }
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
      // Increased staggering to better respect rate limits (500ms between requests)
      await new Promise((r) => setTimeout(r, index * 500))
      try {
        const result = await this.getSingleCalculation(endpoint, payload)
        results[endpoint] = result
      } catch (error) {
        errors[endpoint] = error.message
        // Only log warnings for non-500 errors to reduce noise
        if (!error.message.includes('500') && !error.message.includes('429')) {
          console.warn(`Failed to fetch ${endpoint}:`, error.message)
        } else if (error.message.includes('429')) {
          console.log(`[API] ${endpoint} rate limited (429), will retry with backoff`)
        } else {
          console.log(`[API] ${endpoint} temporarily unavailable (500 error)`)
        }
      }
    })

    await Promise.all(promises)
    return { results, errors }
  }
}

// Export both for backward compatibility
export const choghadiyaAPI = astrologyAPI
export default astrologyAPI

// --- Client-side helpers for Samvat info ---
// Posts a payload to our Next.js route `/samvatinfo`
export async function postSamvatInfo(payload) {
  const res = await fetch('/api/astro/samvatinfo', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Failed to fetch /samvatinfo: ${res.status} ${errText}`)
  }
  return res.json()
}

// Gets real-time date/time and geolocation from the browser and posts to /samvatinfo
// Usage (client components only): const data = await getRealtimeSamvatInfo()
export async function getRealtimeSamvatInfo(options = {}) {
  if (typeof window === 'undefined') {
    throw new Error('getRealtimeSamvatInfo must be called on the client')
  }

  const now = new Date()
  const tz = -now.getTimezoneOffset() / 60

  const config = {
    observation_point: options.observation_point || 'topocentric',
    ayanamsha: options.ayanamsha || 'lahiri',
    lunar_month_definition: options.lunar_month_definition || 'amanta',
  }

  const position = await new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 60_000,
      timeout: 15_000,
    })
  })

  const { latitude, longitude } = position.coords

  const payload = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    date: now.getDate(),
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
    latitude,
    longitude,
    timezone: typeof options.timezone === 'number' ? options.timezone : tz,
    config,
  }

  return postSamvatInfo(payload)
}

// --- Geocoding & Timezone helpers for Predictions ---
// OpenStreetMap Nominatim geocoding (no key needed). Returns { lat, lon, display_name } or null
export async function geocodePlace(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    if (!res.ok) throw new Error(`Geocode HTTP ${res.status}`)
    const arr = await res.json()
    if (!Array.isArray(arr) || arr.length === 0) return null
    const first = arr[0]
    return { latitude: parseFloat(first.lat), longitude: parseFloat(first.lon), label: first.display_name }
  } catch (e) {
    console.warn('Geocoding failed:', e?.message)
    return null
  }
}

// Get timezone offset in hours for a coordinate and date using IPGeolocation
// Optimized with timeout and fast fallback for better performance
export async function getTimezoneOffsetHours(lat, lon) {
  // Fast fallback: Use browser timezone immediately if no API key
  const apiKey = typeof window === 'undefined'
    ? process.env.IPGEO_API_KEY
    : process.env.NEXT_PUBLIC_IPGEO_API_KEY
  
  if (!apiKey) {
    // No API key - use browser timezone immediately (fast path)
    const fallback = -new Date().getTimezoneOffset() / 60
    return Math.round(Math.max(-14, Math.min(14, fallback)) * 2) / 2
  }

  try {
    const url = `https://api.ipgeolocation.io/timezone?apiKey=${encodeURIComponent(apiKey)}&lat=${lat}&long=${lon}`
    
    // Use AbortController for timeout (3 seconds max)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    const res = await fetch(url, { 
      signal: controller.signal,
      // Add cache headers for better performance
      cache: 'default'
    })
    
    clearTimeout(timeoutId)
    
    if (!res.ok) throw new Error(`TZ HTTP ${res.status}`)
    const data = await res.json()
    
    // API returns offset in seconds or strings; prefer offset in hours
    let offset
    if (typeof data.timezone_offset === 'number') offset = data.timezone_offset / 3600
    if (typeof data.offset === 'number') offset = data.offset // already hours
    if (typeof data.current_time === 'string') {
      // Fallback: derive from GMT offset text like "+05:30"
      const m = data?.current_time?.match(/GMT([+\-])(\d{2}):(\d{2})/)
      if (m) {
        const sign = m[1] === '-' ? -1 : 1
        offset = sign * (parseInt(m[2], 10) + parseInt(m[3], 10) / 60)
      }
    }
    if (typeof offset !== 'number' || Number.isNaN(offset)) {
      offset = -new Date().getTimezoneOffset() / 60
    }
    // Clamp and round to nearest 0.5 hour for stability
    const clamped = Math.max(-14, Math.min(14, offset))
    return Math.round(clamped * 2) / 2
  } catch (e) {
    // Fast fallback on any error (timeout, network, etc.)
    const fallback = -new Date().getTimezoneOffset() / 60
    const clamped = Math.max(-14, Math.min(14, fallback))
    return Math.round(clamped * 2) / 2
  }
}
