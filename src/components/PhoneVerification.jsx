"use client"

import { useState, useEffect } from 'react'
import { Phone, CheckCircle, X, Loader2 } from 'lucide-react'

export default function PhoneVerification({ 
  userId, 
  userType, 
  onVerified, 
  currentPhone = '',
  required = true 
}) {
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || '')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone') // 'phone', 'otp', 'verified'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [isVerified, setIsVerified] = useState(false)

  // Check if already verified
  useEffect(() => {
    if (currentPhone) {
      checkVerificationStatus()
    }
  }, [currentPhone, userId])

  const checkVerificationStatus = async () => {
    try {
      const response = await fetch(`/api/user/profile?userId=${userId}&userType=${userType}`)
      if (response.ok) {
        const data = await response.json()
        if (data.user?.phoneVerified) {
          setIsVerified(true)
          setStep('verified')
          if (onVerified) onVerified(data.user.phoneNumber)
        }
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
    }
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!phoneNumber || phoneNumber.trim().length < 10) {
      setError('Please enter a valid phone number')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          userId,
          userType
        })
      })

      const data = await response.json()

      if (data.success) {
        setStep('otp')
        setCountdown(60) // 60 seconds countdown
        // Start countdown
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setError(data.error || 'Failed to send OTP')
      }
    } catch (error) {
      setError('Network error. Please try again.')
      console.error('Error sending OTP:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          userId,
          userType,
          otp
        })
      })

      const data = await response.json()

      if (data.success) {
        setIsVerified(true)
        setStep('verified')
        if (onVerified) onVerified(phoneNumber.trim())
      } else {
        setError(data.error || 'Invalid OTP')
      }
    } catch (error) {
      setError('Network error. Please try again.')
      console.error('Error verifying OTP:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = () => {
    if (countdown > 0) return
    setOtp('')
    setError('')
    handleSendOTP({ preventDefault: () => {} })
  }

  if (isVerified && step === 'verified') {
    return (
      <div className="phone-verification verified">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#10b981',
          padding: '1rem',
          backgroundColor: '#d1fae5',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          <CheckCircle size={20} />
          <span>Phone number verified: {phoneNumber}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="phone-verification" style={{
      padding: '1.5rem',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      backgroundColor: '#fff',
      marginBottom: '1rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        <Phone size={20} />
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
          {required ? 'Verify Phone Number' : 'Phone Number Verification'}
        </h3>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <X size={16} />
          <span>{error}</span>
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={handleSendOTP}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151'
            }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 9876543210"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
            />
            <p style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              We'll send you a 6-digit OTP to verify your number
            </p>
          </div>
          <button
            type="submit"
            disabled={loading || !phoneNumber.trim()}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#9ca3af' : '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending OTP...</span>
              </>
            ) : (
              'Send OTP'
            )}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOTP}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151'
            }}>
              Enter OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1.5rem',
                fontFamily: 'monospace',
                textAlign: 'center',
                letterSpacing: '0.5rem'
              }}
            />
            <p style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              OTP sent to {phoneNumber}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setStep('phone')}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Change Number
            </button>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={countdown > 0}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: countdown > 0 ? '#f3f4f6' : '#6366f1',
                color: countdown > 0 ? '#9ca3af' : '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: countdown > 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {countdown > 0 ? `Resend (${countdown}s)` : 'Resend OTP'}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading || otp.length !== 6 ? '#9ca3af' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              'Verify OTP'
            )}
          </button>
        </form>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

