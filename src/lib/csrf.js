// CSRF utility functions
export function generateCSRFToken() {
  return crypto.randomUUID()
}

export function setCSRFHeaders(headers = {}) {
  return {
    ...headers,
    'X-Requested-With': 'XMLHttpRequest'
  }
}

// Custom fetch wrapper with CSRF protection
export async function csrfFetch(url, options = {}) {
  const headers = setCSRFHeaders(options.headers)
  
  return fetch(url, {
    ...options,
    headers
  })
}