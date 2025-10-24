'use client'

import { useAuth } from '@/contexts/AuthContext'
import Wallet from '@/components/Wallet'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function WalletPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/user')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Redirect astrologers to their dashboard
  if (userProfile?.collection === 'astrologers') {
    router.push('/astrologer-dashboard')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <Wallet />
      </div>
    </div>
  )
}