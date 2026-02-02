/**
 * Performance Optimization Utilities
 * Shared utilities for optimizing page performance across the site
 */

/**
 * Lazy load component with Suspense fallback
 * @param {Function} importFn - Dynamic import function
 * @param {React.Component} Fallback - Optional fallback component
 * @returns {React.LazyExoticComponent}
 */
export function createLazyComponent(importFn, Fallback = null) {
  return {
    Component: React.lazy(importFn),
    Fallback: Fallback || (() => null)
  };
}

/**
 * Debounce function for search/input optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll/resize optimization
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 100) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Cache API responses with expiration
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function that returns a Promise
 * @param {number} ttl - Time to live in ms (default: 5 minutes)
 * @returns {Promise} Cached or fresh data
 */
export async function cachedFetch(key, fetchFn, ttl = 300000) {
  const cacheKey = `perf_cache_${key}`;
  const cached = sessionStorage.getItem(cacheKey);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < ttl) {
      return data;
    }
  }
  
  const data = await fetchFn();
  sessionStorage.setItem(cacheKey, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
  
  return data;
}

/**
 * Intersection Observer for lazy loading images/components
 * @param {HTMLElement} element - Element to observe
 * @param {Function} callback - Callback when element is visible
 * @param {Object} options - IntersectionObserver options
 */
export function observeIntersection(element, callback, options = {}) {
  if (!element || typeof window === 'undefined' || !window.IntersectionObserver) {
    callback();
    return;
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback();
        observer.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  });
  
  observer.observe(element);
  return () => observer.disconnect();
}
