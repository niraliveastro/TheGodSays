'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { updateProfile } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

export default function AccountPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(user ? 'profile' : 'signin') // signin | signup | profile

  // If the auth state changes to logged-in, move to Profile tab
  useEffect(() => {
    if (user) setActiveTab('profile')
  }, [user])

  return (
    <div
      className="w-full flex items-center justify-center px-3"
      style={{ minHeight: 'calc(100vh - 64px)', overflow: 'hidden' }}
    >
      <div className="w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden" style={{ maxWidth: 380 }}>
        {/* Card Header */}
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <h1 className="text-lg font-semibold">My Account</h1>
          <p className="text-xs text-gray-600 mt-1">Sign in, create an account, or manage your profile.</p>
        </div>

        {/* Tabs */}
        <div className="p-2 pt-2 pb-0">
          <div className="flex space-x-2">
            {!user ? (
              <>
                <Button
                  size="sm"
                  variant={activeTab === 'signin' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('signin')}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  variant={activeTab === 'signup' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('signup')}
                >
                  Sign Up
                </Button>
              </>
            ) : (
              <div className="px-2 py-1 text-sm text-gray-700 bg-gray-100 rounded">
                My Profile
              </div>
            )}
          </div>
        </div>

        {/* Panels */}
        <div className="p-3">
          {user ? (
            <ProfilePanel />
          ) : (
            <>
              {activeTab === 'signin' && <SignInPanel onSwitch={() => setActiveTab('signup')} />}
              {activeTab === 'signup' && <SignUpPanel onSwitch={() => setActiveTab('signin')} />}
            </>
          )}
        </div>

        {/* Card Footer subtle bar to mimic mock */}
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50"></div>
      </div>
    </div>
  )
}

function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
    </label>
  )
}


function SignInPanel({ onSwitch }) {
  const { signIn } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const email = form.get('email')?.toString() || ''
    const password = form.get('password')?.toString() || ''
    try {
      await signIn(email, password)
      // on success, AccountPage effect will switch to profile
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.')
      console.error('SignIn error', err)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" required />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input type="checkbox" className="w-4 h-4" />
          <span>Remember me</span>
        </label>
        <button type="button" className="text-sm text-blue-600 hover:underline">Forgot password?</button>
      </div>
      <div className="flex items-center space-x-3">
        <Button type="submit" disabled={submitting}>{submitting ? 'Signing In…' : 'Sign In'}</Button>
        <span className="text-sm text-gray-600">
          New here?{' '}
          <button type="button" onClick={onSwitch} className="text-blue-600 hover:underline">
            Create an account
          </button>
        </span>
      </div>
    </form>
  )
}

function SignUpPanel({ onSwitch }) {
  const { signUp } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const name = form.get('name')?.toString() || ''
    const email = form.get('email')?.toString() || ''
    const password = form.get('password')?.toString() || ''
    const confirm = form.get('confirm')?.toString() || ''
    if (password !== confirm) {
      setError('Passwords do not match')
      setSubmitting(false)
      return
    }
    try {
      await signUp(email, password, { displayName: name })
      // on success, AccountPage effect will switch to profile
    } catch (err) {
      setError('Failed to create account. Please try again.')
      console.error('SignUp error', err)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" name="name" placeholder="Your Name" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="••••••••" required />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm Password</Label>
          <Input id="confirm" name="confirm" type="password" placeholder="••••••••" required />
        </div>
      </div>
      <label className="flex items-center space-x-2 text-sm text-gray-700">
        <input type="checkbox" className="w-4 h-4" required />
        <span>I agree to the Terms & Privacy Policy</span>
      </label>
      <div className="flex items-center space-x-3">
        <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create Account'}</Button>
        <span className="text-sm text-gray-600">
          Already have an account?{' '}
          <button type="button" onClick={onSwitch} className="text-blue-600 hover:underline">
            Sign in
          </button>
        </span>
      </div>
    </form>
  )
}

function ProfilePanel() {
  const { user, signOut } = useAuth()
  const [name, setName] = useState(user?.displayName || '')
  const [email] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const isAuthed = !!user

  // Additional profile states stored in Firestore
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('') // yyyy-mm-dd
  const [gender, setGender] = useState('')
  const [location, setLocation] = useState('')

  // Load Firestore profile once user is available
  useEffect(() => {
    let ignore = false
    async function loadProfile() {
      if (!user) return
      try {
        const ref = doc(db, 'users', user.uid)
        const snap = await getDoc(ref)
        if (!ignore && snap.exists()) {
          const data = snap.data() || {}
          setPhone(data.phone || '')
          setDob(data.dob || '')
          setGender(data.gender || '')
          setLocation(data.location || '')
        }
      } catch (err) {
        console.warn('Failed to load user profile doc', err)
      }
    }
    loadProfile()
    return () => { ignore = true }
  }, [user])

  async function onSubmit(e) {
    e.preventDefault()
    if (!isAuthed) return
    setMessage('')
    setSaving(true)
    try {
      // Update only displayName in Firebase Auth profile
      await updateProfile(user, { displayName: name })
      // Upsert Firestore user document with additional profile fields
      const ref = doc(db, 'users', user.uid)
      const payload = { phone, dob, gender, location }
      const existing = await getDoc(ref)
      if (existing.exists()) {
        await updateDoc(ref, payload)
      } else {
        await setDoc(ref, { email: user.email || '', displayName: name, ...payload })
      }
      setMessage('Profile updated successfully.')
    } catch (err) {
      console.error('Profile update error', err)
      setMessage('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {!isAuthed && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-blue-700 text-sm">
            You are not signed in yet. Profile editing will be enabled after authentication.
          </p>
        </div>
      )}
      {message && (
        <div className={`text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label htmlFor="profile_name">Full Name</Label>
            <Input
              id="profile_name"
              name="profile_name"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAuthed}
            />
          </div>
          <div>
            <Label htmlFor="profile_email">Email</Label>
            <Input id="profile_email" name="profile_email" type="email" value={email} disabled />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" placeholder="+91 90000 00000" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isAuthed} />
          </div>
          <div>
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" name="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} disabled={!isAuthed} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label htmlFor="gender">Gender</Label>
            <select id="gender" name="gender" className="w-full h-10 px-3 py-2 border border-gray-200 rounded-md" value={gender} onChange={(e) => setGender(e.target.value)} disabled={!isAuthed}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" placeholder="City, Country" value={location} onChange={(e) => setLocation(e.target.value)} disabled={!isAuthed} />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button type="submit" disabled={!isAuthed || saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" disabled={!isAuthed} onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </form>
    </div>
  )
}
