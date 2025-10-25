'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function AstrologerRedirect() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If the logged-in user's profile indicates astrologer, redirect to dashboard.
    // Also consult a persisted role flag (set at signup/login) as a fallback while profile is loading.
    const persistedRole = typeof window !== 'undefined' ? localStorage.getItem('tgs:role') : null
    const isAstrologer = userProfile?.collection === 'astrologers' || persistedRole === 'astrologer'

    // Allow astrologers to access video and voice call rooms, their dashboard, and auth pages
    const allowedPaths = [
      '/astrologer-dashboard',
      '/talk-to-astrologer/room/',
      '/talk-to-astrologer/voice/',
      '/auth'
    ]
    const isAllowedPath = allowedPaths.some(path => pathname === path || pathname.startsWith(path))

    if (isAstrologer && !isAllowedPath) {
      router.replace('/unauthorized')
    }
  }, [userProfile, pathname, router])

  return null
}