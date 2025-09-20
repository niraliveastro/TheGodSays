// Simple service worker for basic caching
const CACHE_NAME = 'panchang-v1'

self.addEventListener('install', (event) => {
  console.log('Service Worker installing')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return
  
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request)
      })
  )
})
