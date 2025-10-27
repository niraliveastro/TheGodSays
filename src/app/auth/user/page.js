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

export default function UserAuth() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
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
       const result = await signIn(formData.email, formData.password)
        if (result.profile?.collection === 'users') {
          router.push('/talk-to-astrologer')
        } else {
          router.push('/unauthorized')
        }
      } else {
        const user = await signUp(formData.email, formData.password, { displayName: formData.name })
        
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

  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithGoogle()
      
      if (!result.profile) {
        await setDoc(doc(db, 'users', result.user.uid), {
          name: result.user.displayName,
          email: result.user.email,
          role: 'user',
          createdAt: new Date().toISOString()
        })
        router.push('/talk-to-astrologer')
      } else {
        if (result.profile.collection === 'users') {
          router.push('/talk-to-astrologer')
        } else {
          router.push('/unauthorized')
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        <Card className="overflow-hidden shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="hidden md:block bg-gradient-to-b from-blue-600 to-indigo-600 p-8 text-white">
              <h2 className="text-2xl font-semibold mb-2">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
              <p className="text-sm opacity-90">Sign in to get personalized recommendations and talk to expert astrologers.</p>
              <div className="mt-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-95">
                    <path d="M12 2L15 8H9L12 2Z" fill="currentColor" />
                  </svg>
                  Trusted insights
                </div>
              </div>
            </div>

            <div className="p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{isLogin ? 'User Login' : 'User Sign Up'}</h1>
              <p className="text-sm text-gray-500 mb-6">{isLogin ? 'Access your account' : 'Join TheGodSays community'}</p>

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
                            className="pl-10 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                      className="pl-10 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                      className="pl-10 pr-12 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                  <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white" disabled={loading}>
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
                  className="text-blue-600 hover:text-blue-700"
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