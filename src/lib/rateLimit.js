// Simple in-memory rate limiting
const requests = new Map()

export function rateLimit(identifier, maxRequests = 100, windowMs = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean old entries
  if (requests.has(identifier)) {
    const userRequests = requests.get(identifier).filter(time => time > windowStart)
    requests.set(identifier, userRequests)
  } else {
    requests.set(identifier, [])
  }
  
  const userRequests = requests.get(identifier)
  
  if (userRequests.length >= maxRequests) {
    return false // Rate limit exceeded
  }
  
  userRequests.push(now)
  return true // Request allowed
}

export function getRateLimitHeaders(identifier, maxRequests = 100, windowMs = 60000) {
  const userRequests = requests.get(identifier) || []
  const remaining = Math.max(0, maxRequests - userRequests.length)
  const resetTime = Math.ceil((Date.now() + windowMs) / 1000)
  
  return {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString()
  }
}