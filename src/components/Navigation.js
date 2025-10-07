'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, User, Menu, X, Calendar, Star, BookOpen, Eye, EyeOff } from 'lucide-react'
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
  const { user, signIn, signUp, signOut } = useAuth()
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
    { href: '/account', label: 'My Account', icon: User },
  ]

  async function handleAccountClick() {
    try { console.log('[Navigation] My Account clicked', { isAuthed: !!user }) } catch {}
    if (user) {
      setDisplayName(user.displayName || '')
      // Open modal immediately; load Firestore profile in background
      setModalPosition('top-right')
      setShowProfileModal(true)
      try {
        const ref = doc(db, 'users', user.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data() || {}
          setPhone(data.phone || '')
          setDob(data.dob || '')
          setGender(data.gender || '')
          setLocation(data.location || '')
        } else {
          setPhone('')
          setDob('')
          setGender('')
          setLocation('')
        }
      } catch (e) { try { console.warn('[Navigation] Failed to load Firestore user doc', e) } catch {} }
    } else {
      // Open centered auth modal (do not navigate)
      setAuthTab('signin')
      setAuthError('')
      setModalPosition('center')
      setShowProfileModal(true)
    }
  }

  async function onSignOutClick() {
    try {
      await signOut()
    } finally {
      // Switch modal to center and show auth forms
      setAuthTab('signin')
      setAuthError('')
      setModalPosition('center')
      setShowProfileModal(true)
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
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">👍</span>
            </div>
            <span className="text-xl font-bold text-blue-600">TheGodSays</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              if (item.href === '/account') {
                return (
                  <button
                    type="button"
                    key={item.href}
                    onClick={handleAccountClick}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
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
                   className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                     pathname === item.href
                       ? 'bg-blue-100 text-blue-700'
                       : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
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
              {navItems.map((item) => {
                const Icon = item.icon
                if (item.href === '/account') {
                  return (
                    <button
                      type="button"
                      key={item.href}
                      className={`w-full text-left flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        pathname === item.href
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
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
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      pathname === item.href
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
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
