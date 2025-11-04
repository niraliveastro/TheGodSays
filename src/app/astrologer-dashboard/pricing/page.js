'use client'

import { useAuth } from '@/contexts/AuthContext'
import PricingManager from '@/components/PricingManager'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PricingPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/astrologer')
    }
  }, [user, loading, router])

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
            Loading pricing settings...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)',
      padding: '2rem 0'
    }}>
      <div className="app">

                          <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

        {/* Header */}
        <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <h1 className='title'>
            Pricing Settings
          </h1>
          <p style={{
            color: 'var(--color-gray-600)',
            fontSize: '1.125rem',
            maxWidth: '640px',
            margin: '0 auto'
          }}>
            Set your consultation rates for voice and video calls. Clients will see these prices when booking.
          </p>
        </header>

        {/* Pricing Manager */}
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <PricingManager />
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
            All earnings are processed securely. You’ll receive payments directly to your registered account.
          </p>
        </div>
      </div>
    </div>
  )
}