'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Phone,
  Sparkles,
} from 'lucide-react'

export default function UserAuth() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const { signIn, signUp, signInWithGoogle, loading } = useAuth()
  const router = useRouter()

  // --------------------------------------------------------------------------
  // EMAIL/PASSWORD AUTHENTICATION
  // --------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (isLogin) {
        // LOGIN FLOW
        const result = await signIn(formData.email, formData.password)
        
        if (result.profile?.role === 'astrologer') {
          router.push('/astrologer-dashboard')
        } else {
          router.push('/talk-to-astrologer')
        }
      } else {
        // SIGNUP FLOW
        const user = await signUp(formData.email, formData.password, { 
          displayName: formData.name 
        })
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: 'user',
          createdAt: new Date().toISOString()
        })
        
        router.push('/talk-to-astrologer')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // --------------------------------------------------------------------------
  // GOOGLE AUTHENTICATION
  // --------------------------------------------------------------------------
  const handleGoogleAuth = async () => {
    setError('')
    
    try {
      const result = await signInWithGoogle()
      
      // Check if profile exists
      if (!result.profile) {
        // Create new user profile
        await setDoc(doc(db, 'users', result.user.uid), {
          name: result.user.displayName,
          email: result.user.email,
          role: 'user',
          createdAt: new Date().toISOString()
        })
        router.push('/talk-to-astrologer')
      } else {
        // Existing user - route based on role
        if (result.profile.role === 'astrologer') {
          router.push('/astrologer-dashboard')
        } else {
          router.push('/talk-to-astrologer')
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // --------------------------------------------------------------------------
  // FORM FIELD HANDLERS
  // --------------------------------------------------------------------------
  const toggleAuthMode = () => {
    setIsLogin(!isLogin)
    setError('')
  }

  const updateFormField = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  // ============================================================================
  // RENDER UI
  // ============================================================================
  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Back button */}
      <button
        className="back-btn"
        onClick={() => router.back()}
        aria-label="Go back"
      >
        <ArrowLeft />
      </button>

      {/* Auth card */}
      <div className="auth-card">
        <div className="accent-line" />

        {/* Logo section */}
        <div className="logo-section">
          <div className="logo-badge">
            <div className="logo-icon">
              <Sparkles />
            </div>
            <span className="logo-text">TheGodSays</span>
          </div>
          <h1 className="auth-title">
            {isLogin ? 'Welcome Back' : 'Join Our Journey'}
          </h1>
          <p className="auth-subtitle">
            {isLogin
              ? 'Continue your cosmic exploration'
              : 'Begin your path to enlightenment'}
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="error-alert" role="alert">
            {error}
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Sign-up only fields */}
          {!isLogin && (
            <>
              <div className="form-field">
                <label className="form-field-label">
                  <User />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  className="form-field-input"
                  required
                  aria-label="Full name"
                />
              </div>

              <div className="form-field">
                <label className="form-field-label">
                  <Phone />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => updateFormField('phone', e.target.value)}
                  className="form-field-input"
                  required
                  aria-label="Phone number"
                />
              </div>
            </>
          )}

          {/* Email field */}
          <div className="form-field">
            <label className="form-field-label">
              <Mail />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => updateFormField('email', e.target.value)}
              className="form-field-input"
              required
              aria-label="Email address"
            />
          </div>

          {/* Password field */}
          <div className="form-field">
            <label className="form-field-label">
              <Lock />
              <span>Password</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => updateFormField('password', e.target.value)}
                className="form-field-input password-input"
                required
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
            aria-label={isLogin ? 'Sign in' : 'Create account'}
          >
            {loading ? (
              <>
                <div className="spinner" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="divider">
          <div className="divider-line" />
          <span className="divider-text">OR CONTINUE WITH</span>
          <div className="divider-line" />
        </div>

        {/* Google sign-in button */}
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="google-btn"
          type="button"
          aria-label="Continue with Google"
        >
          <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 6.75c1.63 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Google</span>
        </button>

        {/* Toggle between login/signup */}
        <p className="toggle-text">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={toggleAuthMode} className="toggle-link" type="button">
            {isLogin ? 'Sign up now' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}