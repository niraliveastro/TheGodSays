'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, User, Menu, X, Calendar, Star, BookOpen, Eye, EyeOff, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Modal from '@/components/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { updateProfile } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, userProfile, signIn, signUp, signOut, signInWithGoogle } = useAuth()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalPosition, setModalPosition] = useState('center') // 'center' | 'top-right'
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [location, setLocation] = useState('')
  const [authTab, setAuthTab] = useState('signin') // 'signin' | 'signup'
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [showPwSignin, setShowPwSignin] = useState(false)
  const [showPwSignup, setShowPwSignup] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)

  // When user logs in from the centered auth modal, switch to top-right profile view automatically
  useEffect(() => {
    if (user && showProfileModal) {
      setModalPosition('top-right')
    }
  }, [user, showProfileModal])

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/panchang/calender', label: 'Panchang', icon: Calendar },
    { href: '/matching', label: 'Matching', icon: BookOpen },
    { href: '/predictions', label: 'Predictions', icon: Star },
    { href: '/talk-to-astrologer', label: 'Talk to Astrologer', icon: Phone },
    { href: '/account', label: 'My Account', icon: User },
  ]

  // Debug user role
  console.log('User profile:', userProfile)
  console.log('User role:', userProfile?.role)
  
  // Filter navigation items based on user role
  const filteredNavItems = userProfile?.role === 'astrologer' 
    ? [{ href: '/account', label: 'My Account', icon: User }] // Only show My Account for astrologers
    : navItems

  async function handleAccountClick() {
    if (user) {
      setDisplayName(user.displayName || '')
      setModalPosition('top-right')
      setShowProfileModal(true)
      try {
        const collection = userProfile?.role === 'astrologer' ? 'astrologers' : 'users'
        const ref = doc(db, collection, user.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data() || {}
          setPhone(data.phone || '')
          setDob(data.dob || '')
          setGender(data.gender || '')
          setLocation(data.location || '')
        }
      } catch (e) { console.warn('Failed to load user profile', e) }
    } else {
      router.push('/auth')
    }
  }

  async function onSignOutClick() {
    try {
      const wasAstrologer = userProfile?.role === 'astrologer'
      await signOut()
      setShowProfileModal(false)

      // Give React a microtask to propagate auth state changes to context consumers
      await new Promise((res) => setTimeout(res, 50))

      // Refresh current route data and then replace to the target route to avoid history noise
      try { router.refresh() } catch (e) { /* ignore */ }

      if (wasAstrologer) {
        router.replace('/')
      } else {
        router.replace('/auth')
      }
    } catch (e) {
      console.error('Sign out error:', e)
    }
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setAuthError('')
    setAuthSubmitting(true)
    const form = new FormData(e.currentTarget)
    const email = form.get('email')?.toString() || ''
    const password = form.get('password')?.toString() || ''
    try {
      await signIn(email, password)
      // After auth, modal position will switch to top-right via effect
    } catch (err) {
      setAuthError('Failed to sign in. Please check your credentials.')
      console.error('Nav SignIn error', err)
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setAuthError('')
    setAuthSubmitting(true)
    const form = new FormData(e.currentTarget)
    const name = form.get('name')?.toString() || ''
    const email = form.get('email')?.toString() || ''
    const password = form.get('password')?.toString() || ''
    const confirm = form.get('confirm')?.toString() || ''
    if (password !== confirm) {
      setAuthError('Passwords do not match')
      setAuthSubmitting(false)
      return
    }
    try {
      await signUp(email, password, { displayName: name })
      setDisplayName(name)
    } catch (err) {
      setAuthError('Failed to create account. Please try again.')
      console.error('Nav SignUp error', err)
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function onSaveProfile(e) {
    e?.preventDefault?.()
    if (!user) return
    setSaving(true)
    try {
      await updateProfile(user, { displayName })
      const ref = doc(db, 'users', user.uid)
      const payload = { phone, dob, gender, location, email: user.email || '', displayName }
      const existing = await getDoc(ref)
      if (existing.exists()) {
        await updateDoc(ref, payload)
      } else {
        await setDoc(ref, payload)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <nav className="nav-glass border-b shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">👍</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">TheGodSays</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {(userProfile?.role === 'astrologer' || pathname === '/astrologer-dashboard' ? [{ href: '/account', label: 'My Account', icon: User }] : navItems).map((item) => {
              const Icon = item.icon
              if (item.href === '/account') {
                return (
                  <button
                    type="button"
                    key={item.href}
                    onClick={handleAccountClick}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      pathname === item.href
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                )
              }
              return (
                 <Link
                   key={item.href}
                   href={item.href}
                   className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                     pathname === item.href
                       ? 'bg-blue-600 text-white shadow-sm'
                       : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                   }`}
                 >
                   <Icon className="w-4 h-4" />
                   <span>{item.label}</span>
                 </Link>
               )
             })}
           </div>

           {/* Mobile menu button */}
           <div className="md:hidden flex items-center">
             <Button
               variant="ghost"
               onClick={() => setIsOpen(!isOpen)}
             >
               {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
             </Button>
          </div>
        </div>
        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              {(userProfile?.role === 'astrologer' || pathname === '/astrologer-dashboard' ? [{ href: '/account', label: 'My Account', icon: User }] : navItems).map((item) => {
                const Icon = item.icon
                if (item.href === '/account') {
                  return (
                    <button
                      type="button"
                      key={item.href}
                      className={`w-full text-left flex items-center space-x-2 px-3 py-2 rounded-lg text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      pathname === item.href
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                      }`}
                      onClick={() => { setIsOpen(false); handleAccountClick() }}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  )
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      pathname === item.href
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
        {/* Profile Modal top-right */}
        <Modal
          open={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          title={user ? 'My Profile' : (authTab === 'signin' ? 'Sign In' : 'Create Account')}
          position={modalPosition}
          topOffset={modalPosition === 'top-right' ? 80 : undefined}
        >
          {user ? (
            <form onSubmit={onSaveProfile} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  className="w-full h-10 px-3 py-2 border border-gray-200 rounded-md"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  className="w-full h-10 px-3 py-2 border border-gray-200 rounded-md bg-gray-50"
                  value={user.email || ''}
                  disabled
                />
              </div>
              {userProfile?.role && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    className="w-full h-10 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 capitalize"
                    value={userProfile.role}
                    disabled
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  className="w-full h-10 px-3 py-2 border border-gray-200 rounded-md"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 90000 00000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  className="w-full h-10 px-3 py-2 border border-gray-200 rounded-md"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  className="w-full h-10 px-3 py-2 border border-gray-200 rounded-md"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  className="w-full h-10 px-3 py-2 border border-gray-200 rounded-md"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Country"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                <Button type="button" variant="outline" onClick={onSignOutClick}>Sign Out</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 max-w-md">
              <div className="inline-flex items-center rounded-xl bg-gray-100 p-1.5 gap-2">
                <button
                  type="button"
                  onClick={() => setAuthTab('signin')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${authTab === 'signin' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-white'}`}
                  aria-selected={authTab === 'signin'}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab('signup')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${authTab === 'signup' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-white'}`}
                  aria-selected={authTab === 'signup'}
                >
                  Sign Up
                </button>
              </div>
              {authError && (
                <div className="text-sm rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2">
                  {authError}
                </div>
              )}
              {/* Social auth */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={async () => { setAuthError(''); try { await signInWithGoogle() } catch (e) { setAuthError('Google sign-in failed'); console.error(e) } }}
                  className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                >
                  {/* Inline Google G icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.4 29.2 36 24 36 16.8 36 11 30.2 11 23s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.3l5.7-5.7C34.5 4.1 29.5 2 24 2 12.3 2 3 11.3 3 23s9.3 21 21 21c10.5 0 20-7.6 20-21 0-1.7-.2-3.3-.4-4.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.3 0 6.3 1.2 8.6 3.3l5.7-5.7C34.5 4.1 29.5 2 24 2 15.5 2 8.2 6.7 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.1 0 9.8-1.9 13.4-5.1l-6.2-5.1C29 35.5 26.7 36 24 36c-5.2 0-9.6-3.6-11.3-8.5l-6.5 5C8.1 38.9 15.4 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.1 5.3-5.9 6.8l6.2 5.1C38.6 37.8 42 31.6 42 23c0-1.7-.2-3.3-.4-4.5z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-800">Continue with Google</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="h-px bg-gray-200 flex-1" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>
              </div>

              {authTab === 'signin' ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required className="w-full h-11 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input name="password" type={showPwSignin ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" required className="w-full h-11 pr-14 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    <button
                      type="button"
                      onClick={() => setShowPwSignin(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                      aria-label={showPwSignin ? 'Hide password' : 'Show password'}
                    >
                      {showPwSignin ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                    </button>
                  </div>
                  <Button className="w-full" type="submit" disabled={authSubmitting}>{authSubmitting ? 'Signing In…' : 'Sign In'}</Button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input name="name" placeholder="Your name" required className="w-full h-11 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required className="w-full h-11 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input name="password" type={showPwSignup ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" required className="w-full h-11 pr-14 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      <button
                        type="button"
                        onClick={() => setShowPwSignup(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                        aria-label={showPwSignup ? 'Hide password' : 'Show password'}
                      >
                        {showPwSignup ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                      </button>
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
                      <input name="confirm" type={showPwConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" required className="w-full h-11 pr-14 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      <button
                        type="button"
                        onClick={() => setShowPwConfirm(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                        aria-label={showPwConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showPwConfirm ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>
                  <Button className="w-full" type="submit" disabled={authSubmitting}>{authSubmitting ? 'Creating…' : 'Create Account'}</Button>
                </form>
              )}
            </div>
          )}
        </Modal>
      </div>
    </nav>
  )
}

export default Navigation
