'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function AstrologerAuth() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    specialization: '',
    experience: '',
    languages: ''
  })
  const [error, setError] = useState('')
  const { signIn, signUp, signInWithGoogle, loading } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      let result
      if (isLogin) {
        result = await signIn(formData.email, formData.password)
        if (result.profile?.collection === 'astrologers') {
          router.push('/astrologer-dashboard')
        } else {
          router.push('/unauthorized')
        }
      } else {
        const user = await signUp(formData.email, formData.password, { displayName: formData.name })
        
        await setDoc(doc(db, 'astrologers', user.uid), {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          specialization: formData.specialization,
          experience: formData.experience,
          languages: formData.languages.split(',').map(lang => lang.trim()),
          role: 'astrologer',
          status: 'offline',
          rating: 0,
          reviews: 0,
          verified: false,
          isOnline: false,
          bio: `Expert in ${formData.specialization} with ${formData.experience} of experience.`,
          createdAt: new Date().toISOString()
        })

        await fetch('/api/astrologer/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            astrologerId: user.uid,
            action: 'set-offline'
          })
        })
        
        // Persist role in localStorage so returning to the site redirects to dashboard
        try { if (typeof window !== 'undefined') localStorage.setItem('tgs:role', 'astrologer') } catch (e) {}
        router.push('/astrologer-dashboard')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithGoogle()
      
      if (!result.profile) {
        await setDoc(doc(db, 'astrologers', result.user.uid), {
          name: result.user.displayName,
          email: result.user.email,
          role: 'astrologer',
          status: 'offline',
          rating: 0,
          reviews: 0,
          verified: false,
          isOnline: false,
          specialization: 'Vedic Astrology',
          experience: '1-3 years',
          languages: ['English'],
          bio: 'Experienced astrologer providing guidance and insights.',
          createdAt: new Date().toISOString()
        })
        try { if (typeof window !== 'undefined') localStorage.setItem('tgs:role', 'astrologer') } catch (e) {}
        router.push('/astrologer-dashboard')
      } else {
        if (result.profile.collection === 'astrologers') {
          router.push('/astrologer-dashboard')
        } else {
          router.push('/unauthorized')
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-yellow-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        <Card className="overflow-hidden shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="hidden md:block bg-gradient-to-b from-yellow-500 to-orange-500 p-8 text-white">
              <h2 className="text-2xl font-semibold mb-2">{isLogin ? 'Welcome back' : 'Join as an Astrologer'}</h2>
              <p className="text-sm opacity-95">Create your profile and connect with seekers looking for guidance.</p>
              <div className="mt-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-95">
                    <path d="M12 2L15 8H9L12 2Z" fill="currentColor" />
                  </svg>
                  Get discovered by users
                </div>
              </div>
            </div>

            <div className="p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{isLogin ? 'Astrologer Login' : 'Astrologer Sign Up'}</h1>
              <p className="text-sm text-gray-500 mb-6">{isLogin ? 'Sign in to manage your sessions' : 'Create your astrologer profile'}</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Full name</label>
                      <div className="relative flex items-center">
                        <Input
                          type="text"
                          placeholder="Your full name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="pl-10 w-full border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Phone</label>
                      <Input
                        type="tel"
                        placeholder="Phone number"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className=""
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Specialization</label>
                      <div className="relative flex items-center">
                        <select
                          value={formData.specialization}
                          onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 appearance-none bg-white"
                          required
                        >
                          <option value="">Select Specialization</option>
                          <option value="Vedic Astrology">Vedic Astrology</option>
                          <option value="Tarot Reading">Tarot Reading</option>
                          <option value="Numerology">Numerology</option>
                          <option value="Palmistry">Palmistry</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Experience</label>
                      <select
                        value={formData.experience}
                        onChange={(e) => setFormData({...formData, experience: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        required
                      >
                        <option value="">Years of Experience</option>
                        <option value="1-3 years">1-3 years</option>
                        <option value="3-5 years">3-5 years</option>
                        <option value="5-10 years">5-10 years</option>
                        <option value="10+ years">10+ years</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Languages</label>
                      <Input
                        type="text"
                        placeholder="Languages (e.g., Hindi, English)"
                        value={formData.languages}
                        onChange={(e) => setFormData({...formData, languages: e.target.value})}
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Email</label>
                  <div className="relative flex items-center">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="pl-10 w-full border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Password</label>
                  <div className="relative flex items-center">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a secure password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="pl-10 pr-12 w-full border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-gray-500 hover:text-gray-700 z-10"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white" disabled={loading}>
                    {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create account')}
                  </Button>
                </div>
              </form>

              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                >
                  Continue with Google
                </Button>
              </div>

              <div className="mt-6 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}