'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthGuard({ children, requireAuth = true, allowedRoles = [] }) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (requireAuth && !user) {
      router.push('/login')
      return
    }

    if (allowedRoles.length > 0 && userProfile) {
      const userRole = userProfile.collection === 'astrologers' ? 'astrologer' : 'user'
      if (!allowedRoles.includes(userRole)) {
        router.push('/unauthorized')
        return
      }
    }
  }, [user, userProfile, loading, requireAuth, allowedRoles, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (requireAuth && !user) {
    return null
  }

  if (allowedRoles.length > 0 && userProfile && !allowedRoles.includes(userProfile.collection === 'astrologers' ? 'astrologer' : 'user')) {
    return null
  }

  return children
}