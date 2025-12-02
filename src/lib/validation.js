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

  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    throw new Error(`Invalid date values: year=${year}, month=${month}, date=${date}. All must be numbers.`)
  }

  const currentYear = new Date().getFullYear()
  const minYear = currentYear - 150 // allow historical birth years
  const maxYear = currentYear + 10 // keep a small buffer for testing/future dates

  if (y < minYear || y > maxYear) {
    throw new Error(`Invalid year: ${y}. Supported range is ${minYear}-${maxYear}.`)
  }
  if (m < 1 || m > 12) {
    throw new Error(`Invalid month: ${m}. Must be between 1 and 12.`)
  }
  if (d < 1 || d > 31) {
    throw new Error(`Invalid date: ${d}. Must be between 1 and 31.`)
  }
  
  return { year: y, month: m, date: d }
}

export function validateTime(hours, minutes, seconds = 0) {
  const h = parseInt(hours)
  const m = parseInt(minutes)
  const s = parseInt(seconds)
  
  if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) {
    throw new Error(`Invalid time values: hours=${hours}, minutes=${minutes}, seconds=${seconds}. All must be numbers.`)
  }
  
  if (h < 0 || h > 23) {
    throw new Error(`Invalid hours: ${h}. Must be between 0 and 23.`)
  }
  if (m < 0 || m > 59) {
    throw new Error(`Invalid minutes: ${m}. Must be between 0 and 59.`)
  }
  if (s < 0 || s > 59) {
    throw new Error(`Invalid seconds: ${s}. Must be between 0 and 59.`)
  }
  
  return { hours: h, minutes: m, seconds: s }
}
