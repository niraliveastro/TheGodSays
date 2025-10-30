// Input validation utilities
export function validateRequired(obj, fields) {
  // Consider only undefined or null as missing. Allow 0/false values.
  const missing = fields.filter(field => obj[field] === undefined || obj[field] === null)
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`)
  }
}

export function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') return ''
  return str.trim().slice(0, maxLength)
}

export function validateCoordinates(lat, lon) {
  const latitude = parseFloat(lat)
  const longitude = parseFloat(lon)
  
  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Invalid latitude')
  }
  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Invalid longitude')
  }
  
  return { latitude, longitude }
}

export function validateDate(year, month, date) {
  const y = parseInt(year)
  const m = parseInt(month)
  const d = parseInt(date)
  
  if (y < 1900 || y > 2100) throw new Error('Invalid year')
  if (m < 1 || m > 12) throw new Error('Invalid month')
  if (d < 1 || d > 31) throw new Error('Invalid date')
  
  return { year: y, month: m, date: d }
}

export function validateTime(hours, minutes, seconds = 0) {
  const h = parseInt(hours)
  const m = parseInt(minutes)
  const s = parseInt(seconds)
  
  if (h < 0 || h > 23) throw new Error('Invalid hours')
  if (m < 0 || m > 59) throw new Error('Invalid minutes')
  if (s < 0 || s > 59) throw new Error('Invalid seconds')
  
  return { hours: h, minutes: m, seconds: s }
}