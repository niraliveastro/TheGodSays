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
    // Redirect astrologers
    if (userProfile?.collection === 'astrologers') {
      router.push('/astrologer-dashboard')
    }
  }, [user, userProfile, loading, router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '4px solid transparent',
            borderTop: '4px solid #d4af37',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: 'var(--color-gray-600)', fontSize: '1rem' }}>
            Loading your wallet...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Redirect astrologers (client-side fallback)
  if (userProfile?.collection === 'astrologers') {
    return null
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)',
      padding: '2rem 0'
    }}>
      <div className="container">
        {/* Wallet Header */}
        <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-gray-900)',
            marginBottom: '0.75rem',
            background: 'linear-gradient(135deg, #d4af37, #b8972e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            My Wallet
          </h1>
          <p style={{
            color: 'var(--color-gray-600)',
            fontSize: '1.125rem',
            maxWidth: '640px',
            margin: '0 auto'
          }}>
            Manage your earnings, view transaction history, and withdraw funds securely.
          </p>
        </header>

        {/* Wallet Component */}
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Wallet />
        </div>

        {/* Footer Note */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          padding: '1.5rem',
          color: 'var(--color-gray-500)',
          fontSize: '0.875rem'
        }}>
          <p>
            All transactions are secure and processed instantly. Minimum withdrawal: ₹500
          </p>
        </div>
      </div>
    </div>
  )
}