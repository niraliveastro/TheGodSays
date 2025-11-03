'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  Phone,
  Wallet,
  Clock,
  Edit2,
  Camera,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Modal from '@/components/Modal'
import { useAuth } from '@/contexts/AuthContext'

export default function ProfilePage() {
  const router = useRouter()
  const { user: authUser, signOut } = useAuth()

  /* --------------------------------------------------------------- */
  /*  State                                                          */
  /* --------------------------------------------------------------- */
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [callHistory, setCallHistory] = useState([])

  /* --------------------------------------------------------------- */
  /*  Fetch user + call history                                      */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    const fetchProfile = async () => {
      const userId = localStorage.getItem('tgs:userId')
      if (!userId) {
        router.push('/auth')
        return
      }

      try {
        // Mock API – replace with real endpoint
        const res = await fetch(`/api/user/profile?userId=${userId}`)
        const data = await res.json()
        if (data.success) {
          setUser(data.user)
          setEditForm({
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone || '',
          })
        }
      } catch (e) {
        console.error(e)
      }

      try {
        const histRes = await fetch(`/api/calls/history?userId=${userId}`)
        const histData = await histRes.json()
        if (histData.success) {
          setCallHistory(histData.history.slice(0, 5)) // last 5 calls
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  /* --------------------------------------------------------------- */
  /*  Save profile changes                                           */
  /* --------------------------------------------------------------- */
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const userId = localStorage.getItem('tgs:userId')
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...editForm }),
      })
      const data = await res.json()
      if (data.success) {
        setUser((prev) => ({ ...prev, ...editForm }))
        setIsEditModalOpen(false)
      } else {
        alert(data.message || 'Failed to update profile')
      }
    } catch (e) {
      alert('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth/user')
    } catch (e) {
      console.error('Sign out error:', e)
    }
  }

  /* --------------------------------------------------------------- */
  /*  Render                                                         */
  /* --------------------------------------------------------------- */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: '2rem', height: '2rem', animation: 'spin 1s linear infinite', color: 'var(--color-gold)' }} />
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '1.125rem', color: 'var(--color-gray-600)' }}>No user data found.</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--color-gray-50)', padding: '2rem 0' }}>
        <div className="app">
                 {/* Orbs */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div className="orb orb1" />
          <div className="orb orb2" />
          <div className="orb orb3" />
        </div>

          {/* Header */}
          <header className='header'>
            <h1 className='title'>My Profile</h1>
            <p className='subtitle'>
              Manage your account details, wallet balance, and call history.
            </p>
          </header>

          <div className="profile-grid">
            {/* Left: Profile Card */}
            <div className="card" style={{ padding: '2rem', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '6rem',
                      height: '6rem',
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.75rem',
                    }}
                  >
                    {user.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <button
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      width: '2rem',
                      height: '2rem',
                      background: 'var(--color-gold)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => alert('Avatar upload coming soon!')}
                  >
                    <Camera style={{ width: '1rem', height: '1rem' }} />
                  </button>
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--color-gray-900)' }}>
                    {user.name}
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
                    Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Mail style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-indigo)' }} />
                  <span style={{ fontSize: '1rem', color: 'var(--color-gray-700)' }}>{user.email}</span>
                </div>
                {user.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Phone style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-indigo)' }} />
                    <span style={{ fontSize: '1rem', color: 'var(--color-gray-700)' }}>{user.phone}</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  className="btn btn-outline"
                  style={{ width: '100%', height: '3rem', fontSize: '1rem' }}
                >
                  <Edit2 style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                  Edit Profile
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  style={{ width: '100%', height: '3rem', fontSize: '1rem', color: '#dc2626', borderColor: '#dc2626' }}
                >
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Right: Wallet + Stats */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Wallet */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Wallet style={{ width: '1.5rem', height: '1.5rem', color: 'var(--color-gold)' }} />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Wallet Balance</h3>
                  </div>
                  <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: '#10b981' }} />
                </div>
                <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#059669' }}>
                  ₹{user.balance?.toFixed(2) || '0.00'}
                </p>
                <Button
                  onClick={() => router.push('/wallet')}
                  className="btn btn-primary"
                  style={{ marginTop: '1rem', width: '100%', height: '3rem', fontSize: '1rem' }}
                >
                  Recharge Now
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Quick Stats</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Total Calls</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                      {user.totalCalls || 0}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Minutes Used</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                      {user.minutesUsed || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call History */}
          <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-indigo)' }} />
                Recent Calls
              </h3>
              <Button
                onClick={() => router.push('/call-history')}
                variant="ghost"
                style={{ fontSize: '0.875rem', color: 'var(--color-indigo)' }}
              >
                View All
              </Button>
            </div>

            {callHistory.length > 0 ? (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {callHistory.map((call) => (
                  <div
                    key={call.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      background: 'var(--color-gray-50)',
                      borderRadius: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.875rem',
                        }}
                      >
                        {call.type === 'video' ? 'V' : 'A'}
                      </div>
                      <div>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-gray-900)' }}>
                          {call.astrologerName}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
                          {new Date(call.startedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#dc2626' }}>
                        -₹{call.cost?.toFixed(2)}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
                        {call.duration} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--color-gray-500)', padding: '2rem 0' }}>
                No call history yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profile">
        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
              Full Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '0.75rem',
                fontSize: '1rem',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-gold)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-gray-300)')}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
              Email
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '0.75rem',
                fontSize: '1rem',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-gold)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-gray-300)')}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
              Phone (Optional)
            </label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="+91 98765 43210"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '0.75rem',
                fontSize: '1rem',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-gold)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-gray-300)')}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn btn-primary"
              style={{ flex: 1, height: '3rem', fontSize: '1rem' }}
            >
              {saving ? (
                <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
              ) : (
                <CheckCircle style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              onClick={() => setIsEditModalOpen(false)}
              variant="outline"
              className="btn btn-outline"
              style={{ flex: 1, height: '3rem', fontSize: '1rem' }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Local Animations */}
      <style jsx>{`
        .profile-grid {
          display: grid;
          gap: 2rem;
          grid-template-columns: 1fr;
        }
        
        @media (min-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}