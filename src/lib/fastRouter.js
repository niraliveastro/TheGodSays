/**
 * Fast Router Utility
 * Provides optimized client-side routing with prefetching
 */

/**
 * Fast navigation using Next.js router (client-side only)
 * Replaces window.location.href for instant navigation
 */
export function fastNavigate(router, path, options = {}) {
  if (typeof window === 'undefined') return;
  
  // Prefetch the route if not already prefetched
  if (options.prefetch !== false) {
    router.prefetch(path);
  }
  
  // Use router.push for instant client-side navigation
  router.push(path);
}

/**
 * Prefetch multiple routes in parallel
 */
export function prefetchRoutes(router, routes) {
  if (typeof window === 'undefined') return;
  
  routes.forEach(route => {
    router.prefetch(route);
  });
}

/**
 * Common routes to prefetch on app load
 */
export const COMMON_ROUTES = [
  '/kundli-prediction/',
  '/kundli-matching/',
  '/panchang',
  '/talk-to-astrologer/',
  '/wallet',
  '/numerology',
];

