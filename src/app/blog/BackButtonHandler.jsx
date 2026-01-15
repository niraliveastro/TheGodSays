'use client'

import { useEffect } from 'react'

/**
 * Detects back button navigation from bfcache and forces a fresh page load
 * This prevents the browser from showing stale cached content with wrong styles
 */
export default function BackButtonHandler() {
  useEffect(() => {
    // Detect if page was restored from bfcache (back/forward cache)
    const handlePageShow = (event) => {
      if (event.persisted) {
        // Page was restored from bfcache - reload to get fresh content
        window.location.reload()
      }
    }
    
    // Listen for page show events (bfcache restore)
    window.addEventListener('pageshow', handlePageShow)
    
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])
  
  return null
}
