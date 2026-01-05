'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function AstrologerRedirect() {
  const { userProfile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return

    // If the logged-in user's profile indicates astrologer, redirect to dashboard.
    // Also consult a persisted role flag (set at signup/login) as a fallback while profile is loading.
    const persistedRole = typeof window !== 'undefined' ? localStorage.getItem('tgs:role') : null
    const isAstrologer = userProfile?.collection === 'astrologers' || persistedRole === 'astrologer'

    // If not an astrologer, don't do anything
    if (!isAstrologer) return

    // Allow astrologers to access video and voice call rooms, their dashboard, profile, auth pages, and appointment management
    const allowedPaths = [
      '/astrologer-dashboard',
      '/talk-to-astrologer/room/',
      '/talk-to-astrologer/voice/',
      '/profile/astrology',
      '/account/astrologer',
      '/auth',
      '/appointments/availability', // Allow astrologers to manage availability
      '/appointments', // Allow astrologers to view their appointments
      '/unauthorized' // Allow access to unauthorized page itself
    ]
    
    // Also allow access to specific astrologer profile pages
    const isSpecificProfile = /^\/account\/astrologer\/[^\/]+$/.test(pathname)
    
    const isAllowedPath = allowedPaths.some(path => pathname === path || pathname.startsWith(path)) || isSpecificProfile

    // If astrologer is on home page, redirect to dashboard
    if (pathname === '/') {
      router.replace('/astrologer-dashboard')
      return
    }

    // If astrologer is on a user-specific page (not allowed), redirect to unauthorized
    if (!isAllowedPath) {
      router.replace('/unauthorized')
    }
  }, [userProfile, pathname, router, loading])

  return null
}