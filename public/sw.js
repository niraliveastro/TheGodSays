// Simple service worker for basic caching
const CACHE_NAME = 'panchang-v3'

self.addEventListener('install', (event) => {
  console.log('Service Worker installing')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return
  
  const url = new URL(event.request.url)
  const isCSS = url.pathname.endsWith('.css') || 
                url.pathname.includes('/_next/static/css/') ||
                url.pathname.includes('matching_styles.css')
  
  const isIcon = url.pathname.includes('icon-') || 
                 url.pathname.includes('favicon') ||
                 url.pathname.includes('manifest.json') ||
                 url.pathname.includes('apple-touch-icon')
  
  // For CSS files, use network-first strategy to ensure fresh styles
  if (isCSS) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Don't cache CSS files - always fetch fresh
          return response
        })
        .catch(() => {
          // Only fallback to cache if network completely fails
          return caches.match(event.request)
        })
    )
    return
  }
  
  // For icon files and manifest, always fetch fresh to ensure updates
  if (isIcon) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Don't cache icon/manifest files - always fetch fresh
          return response
        })
        .catch(() => {
          // Only fallback to cache if network completely fails
          return caches.match(event.request)
        })
    )
    return
  }
  
  // For other files, use network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request)
      })
  )
})
