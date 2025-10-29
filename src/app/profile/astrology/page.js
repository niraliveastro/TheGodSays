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
  Globe,
  Star,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Modal from '@/components/Modal'
import { useAuth } from '@/contexts/AuthContext'

export default function AstrologerProfilePage() {
  const router = useRouter()
  const { user: authUser, userProfile, signOut } = useAuth()

  /* --------------------------------------------------------------- */
  /*  State                                                          */
  /* --------------------------------------------------------------- */
  const [astrologer, setAstrologer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    experience: '',
    languages: [],
    perMinuteCharge: 0,
    bio: '',
  })
  const [saving, setSaving] = useState(false)
  const [callHistory, setCallHistory] = useState([])

  /* --------------------------------------------------------------- */
  /*  Fetch astrologer + history                                     */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    if (!authUser || userProfile?.collection !== 'astrologers') {
      router.push('/account')
      return
    }

    // Use Firebase Auth user data directly with mock astrologer data
    const astrologerData = {
      name: authUser.displayName || 'Astrologer',
      email: authUser.email,
      phone: authUser.phoneNumber || '',
      specialization: 'Vedic Astrology',
      experience: '10+ years',
      languages: ['Hindi', 'English'],
      pricing: { finalPrice: 50 },
      bio: 'Experienced astrologer specializing in Vedic astrology.',
      verified: true,
      earnings: 15000.00,
      monthlyEarnings: 5000,
      totalCalls: 150,
      rating: 4.8,
      reviews: 89,
      status: 'online'
    }
    
    setAstrologer(astrologerData)
    setIsOnline(astrologerData.status === 'online')
    setEditForm({
      name: astrologerData.name,
      email: astrologerData.email,
      phone: astrologerData.phone,
      specialization: astrologerData.specialization,
      experience: astrologerData.experience,
      languages: astrologerData.languages,
      perMinuteCharge: astrologerData.pricing.finalPrice,
      bio: astrologerData.bio,
    })
    
    // Mock call history
    setCallHistory([
      { id: 1, userName: 'Priya S.', startedAt: '2024-01-15T10:30:00Z', duration: 15, earning: 750, type: 'audio' },
      { id: 2, userName: 'Raj K.', startedAt: '2024-01-14T14:20:00Z', duration: 20, earning: 1000, type: 'video' },
    ])
    
    setLoading(false)
  }, [authUser, userProfile, router])

  /* --------------------------------------------------------------- */
  /*  Toggle online status                                           */
  /* --------------------------------------------------------------- */
  const toggleOnline = async () => {
    setToggling(true)
    try {
      const newStatus = !isOnline
      setIsOnline(newStatus)
      alert(`Status updated to ${newStatus ? 'online' : 'offline'}!`)
    } catch (e) {
      alert('Failed to update status')
    } finally {
      setToggling(false)
    }
  }

  /* --------------------------------------------------------------- */
  /*  Save profile changes                                           */
  /* --------------------------------------------------------------- */
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      // Update astrologer data locally (in real app, update Firebase/Firestore)
      setAstrologer((prev) => ({ ...prev, ...editForm }))
      setIsEditModalOpen(false)
      alert('Profile updated successfully!')
    } catch (e) {
      alert('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/account')
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

  if (!astrologer) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '1.125rem', color: 'var(--color-gray-600)' }}>No astrologer data found.</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'var(--color-gray-50)', padding: '2rem 0' }}>
        <div className="container">

          {/* Header */}
          <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '2.75rem', fontWeight: 700 }}>Astrologer Dashboard</h1>
            <p style={{ fontSize: '1.125rem', color: 'var(--color-gray-600)', maxWidth: '48rem', margin: '0 auto' }}>
              Manage your profile, availability, pricing, and earnings.
            </p>
          </header>

          <div className="astrologer-profile-grid">
            {/* Left: Profile Card */}
            <div className="card" style={{ padding: '2rem', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '6rem',
                      height: '6rem',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.75rem',
                    }}
                  >
                    {astrologer.name.split(' ').map((n) => n[0]).join('')}
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
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                    {astrologer.name}
                    {astrologer.verified && (
                      <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: '#10b981', display: 'inline-block', marginLeft: '0.5rem' }} />
                    )}
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
                    {astrologer.specialization} • {astrologer.experience}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Mail style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-indigo)' }} />
                  <span style={{ fontSize: '1rem', color: 'var(--color-gray-700)' }}>{astrologer.email}</span>
                </div>
                {astrologer.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Phone style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-indigo)' }} />
                    <span style={{ fontSize: '1rem', color: 'var(--color-gray-700)' }}>{astrologer.phone}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Globe style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-indigo)' }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {astrologer.languages?.map((l, i) => (
                      <span
                        key={l + i}
                        style={{
                          padding: '0.25rem 0.625rem',
                          background: 'var(--color-indigo-light)',
                          color: 'var(--color-indigo)',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          borderRadius: '9999px',
                        }}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button
                    onClick={() => setIsEditModalOpen(true)}
                    className="btn btn-outline"
                    style={{ flex: 1, height: '3rem', fontSize: '1rem' }}
                  >
                    <Edit2 style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                    Edit Profile
                  </Button>
                  <Button
                    onClick={toggleOnline}
                    disabled={toggling}
                    className={isOnline ? 'btn btn-success' : 'btn btn-outline'}
                    style={{ flex: 1, height: '3rem', fontSize: '1rem' }}
                  >
                    {toggling ? (
                      <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
                    ) : isOnline ? (
                      <ToggleRight style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                    ) : (
                      <ToggleLeft style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                    )}
                    {isOnline ? 'Online' : 'Go Online'}
                  </Button>
                </div>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  style={{ width: '100%', height: '3rem', fontSize: '1rem', color: '#dc2626', borderColor: '#dc2626' }}
                >
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Right: Earnings + Stats */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Earnings */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Wallet style={{ width: '1.5rem', height: '1.5rem', color: 'var(--color-gold)' }} />
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Total Earnings</h3>
                  </div>
                  <TrendingUp style={{ width: '1.25rem', height: '1.25rem', color: '#10b981' }} />
                </div>
                <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#059669' }}>
                  ₹{astrologer.earnings?.toFixed(2) || '0.00'}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginTop: '0.5rem' }}>
                  This month: ₹{astrologer.monthlyEarnings || '0'}
                </p>
              </div>

              {/* Stats */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Performance</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Total Calls</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                      {astrologer.totalCalls || 0}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Avg Rating</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Star style={{ width: '1rem', height: '1rem', fill: '#fbbf24', color: '#fbbf24' }} />
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                        {astrologer.rating || '0.0'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Rate/min</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
                      ₹{astrologer.pricing?.finalPrice || 0}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Reviews</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                      {astrologer.reviews || 0}
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
                onClick={() => router.push('/astrologer/call-history')}
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
                          background: call.type === 'video' ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'linear-gradient(135deg, #10b981, #059669)',
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
                          {call.userName || 'User'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
                          {new Date(call.startedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#059669' }}>
                        +₹{call.earning?.toFixed(2)}
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
                No calls yet. Go online to receive calls!
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
              style={inputStyle}
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
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
              Phone
            </label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
              Specialization
            </label>
            <input
              type="text"
              value={editForm.specialization}
              onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
              Experience (e.g., 10+ years)
            </label>
            <input
              type="text"
              value={editForm.experience}
              onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
              Languages (comma separated)
            </label>
            <input
              type="text"
              value={editForm.languages.join(', ')}
              onChange={(e) => setEditForm({ ...editForm, languages: e.target.value.split(',').map(l => l.trim()).filter(Boolean) })}
              placeholder="Hindi, English, Tamil"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
              Rate per Minute (₹)
            </label>
            <input
              type="number"
              value={editForm.perMinuteCharge}
              onChange={(e) => setEditForm({ ...editForm, perMinuteCharge: parseInt(e.target.value) || 0 })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
              Bio
            </label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
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

      {/* Local Styles */}
      <style jsx>{`
        .astrologer-profile-grid {
          display: grid;
          gap: 2rem;
          grid-template-columns: 1fr;
        }
        
        @media (min-width: 768px) {
          .astrologer-profile-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .btn-success {
          background: #10b981;
          color: white;
          border: none;
        }
        .btn-success:hover {
          background: #059669;
        }
      `}</style>
    </>
  )
}

/* Reusable input style */
const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid var(--color-gray-300)',
  borderRadius: '0.75rem',
  fontSize: '1rem',
  outline: 'none',
}
inputStyle[':focus'] = { borderColor: 'var(--color-gold)' }







































































// 'use client'

// import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation'
// import {
//   User,
//   Mail,
//   Phone,
//   Wallet,
//   Clock,
//   Edit2,
//   Camera,
//   Loader2,
//   CheckCircle,
//   Globe,
//   Star,
//   TrendingUp,
//   ToggleLeft,
//   ToggleRight,
// } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import Modal from '@/components/Modal'

// export default function AstrologerProfilePage() {
//   const router = useRouter()

//   /* --------------------------------------------------------------- */
//   /*  State                                                          */
//   /* --------------------------------------------------------------- */
//   const [astrologer, setAstrologer] = useState(null)
//   const [loading, setLoading] = useState(true)
//   const [isEditModalOpen, setIsEditModalOpen] = useState(false)
//   const [isOnline, setIsOnline] = useState(false)
//   const [toggling, setToggling] = useState(false)
//   const [editForm, setEditForm] = useState({
//     name: '',
//     email: '',
//     phone: '',
//     specialization: '',
//     experience: '',
//     languages: [],
//     perMinuteCharge: 0,
//     bio: '',
//   })
//   const [saving, setSaving] = useState(false)
//   const [callHistory, setCallHistory] = useState([])

//   /* --------------------------------------------------------------- */
//   /*  Fetch astrologer + history                                     */
//   /* --------------------------------------------------------------- */
//   useEffect(() => {
//     const fetchProfile = async () => {
//       const astrologerId = localStorage.getItem('tgs:astrologerId')
//       if (!astrologerId) {
//         router.push('/auth/astrologer')
//         return
//       }

//       try {
//         const res = await fetch(`/api/astrologer/profile?astrologerId=${astrologerId}`)
//         const data = await res.json()
//         if (data.success) {
//           const a = data.astrologer
//           setAstrologer(a)
//           setIsOnline(a.status === 'online')
//           setEditForm({
//             name: a.name,
//             email: a.email,
//             phone: a.phone || '',
//             specialization: a.specialization,
//             experience: a.experience,
//             languages: a.languages || [],
//             perMinuteCharge: a.pricing?.finalPrice || 0,
//             bio: a.bio || '',
//           })
//         }
//       } catch (e) {
//         console.error(e)
//       }

//       try {
//         const histRes = await fetch(`/api/calls/history?astrologerId=${astrologerId}`)
//         const histData = await histRes.json()
//         if (histData.success) {
//           setCallHistory(histData.history.slice(0, 5))
//         }
//       } catch (e) {
//         console.error(e)
//       } finally {
//         setLoading(false)
//       }
//     }

//     fetchProfile()
//   }, [router])

//   /* --------------------------------------------------------------- */
//   /*  Toggle online status                                           */
//   /* --------------------------------------------------------------- */
//   const toggleOnline = async () => {
//     setToggling(true)
//     try {
//       const astrologerId = localStorage.getItem('tgs:astrologerId')
//       const newStatus = isOnline ? 'offline' : 'online'
//       const res = await fetch('/api/astrologer/status', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ astrologerId, status: newStatus }),
//       })
//       const data = await res.json()
//       if (data.success) {
//         setIsOnline(newStatus === 'online')
//       } else {
//         alert(data.message || 'Failed to update status')
//       }
//     } catch (e) {
//       alert('Network error')
//     } finally {
//       setToggling(false)
//     }
//   }

//   /* --------------------------------------------------------------- */
//   /*  Save profile changes                                           */
//   /* --------------------------------------------------------------- */
//   const handleSaveProfile = async () => {
//     setSaving(true)
//     try {
//       const astrologerId = localStorage.getItem('tgs:astrologerId')
//       const res = await fetch('/api/astrologer/profile', {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ astrologerId, ...editForm }),
//       })
//       const data = await res.json()
//       if (data.success) {
//         setAstrologer((prev) => ({ ...prev, ...editForm }))
//         setIsEditModalOpen(false)
//       } else {
//         alert(data.message || 'Failed to update profile')
//       }
//     } catch (e) {
//       alert('Network error')
//     } finally {
//       setSaving(false)
//     }
//   }

//   /* --------------------------------------------------------------- */
//   /*  Render                                                         */
//   /* --------------------------------------------------------------- */
//   if (loading) {
//     return (
//       <div style={{ minHeight: '100vh', background: 'var(--color-gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//         <Loader2 style={{ width: '2rem', height: '2rem', animation: 'spin 1s linear infinite', color: 'var(--color-gold)' }} />
//       </div>
//     )
//   }

//   if (!astrologer) {
//     return (
//       <div style={{ minHeight: '100vh', background: 'var(--color-gray-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//         <p style={{ fontSize: '1.125rem', color: 'var(--color-gray-600)' }}>No astrologer data found.</p>
//       </div>
//     )
//   }

//   return (
//     <>
//       <div style={{ minHeight: '100vh', background: 'var(--color-gray-50)', padding: '2rem 0' }}>
//         <div className="container">

//           {/* Header */}
//           <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
//             <h1 style={{ fontSize: '2.75rem', fontWeight: 700 }}>Astrologer Dashboard</h1>
//             <p style={{ fontSize: '1.125rem', color: 'var(--color-gray-600)', maxWidth: '48rem', margin: '0 auto' }}>
//               Manage your profile, availability, pricing, and earnings.
//             </p>
//           </header>

//           <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr', '@media (min-width: 768px)': { gridTemplateColumns: '1fr 1fr' } }}>
//             {/* Left: Profile Card */}
//             <div className="card" style={{ padding: '2rem', position: 'relative' }}>
//               <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
//                 <div style={{ position: 'relative' }}>
//                   <div
//                     style={{
//                       width: '6rem',
//                       height: '6rem',
//                       background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
//                       borderRadius: '50%',
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                       color: 'white',
//                       fontWeight: 'bold',
//                       fontSize: '1.75rem',
//                     }}
//                   >
//                     {astrologer.name.split(' ').map((n) => n[0]).join('')}
//                   </div>
//                   <button
//                     style={{
//                       position: 'absolute',
//                       bottom: '0',
//                       right: '0',
//                       width: '2rem',
//                       height: '2rem',
//                       background: 'var(--color-gold)',
//                       borderRadius: '50%',
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                       color: 'white',
//                       border: 'none',
//                       cursor: 'pointer',
//                     }}
//                     onClick={() => alert('Avatar upload coming soon!')}
//                   >
//                     <Camera style={{ width: '1rem', height: '1rem' }} />
//                   </button>
//                 </div>
//                 <div style={{ flex: 1 }}>
//                   <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
//                     {astrologer.name}
//                     {astrologer.verified && (
//                       <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: '#10b981', display: 'inline-block', marginLeft: '0.5rem' }} />
//                     )}
//                   </h2>
//                   <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
//                     {astrologer.specialization} • {astrologer.experience}
//                   </p>
//                 </div>
//               </div>

//               <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
//                   <Mail style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-indigo)' }} />
//                   <span style={{ fontSize: '1rem', color: 'var(--color-gray-700)' }}>{astrologer.email}</span>
//                 </div>
//                 {astrologer.phone && (
//                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
//                     <Phone style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-indigo)' }} />
//                     <span style={{ fontSize: '1rem', color: 'var(--color-gray-700)' }}>{astrologer.phone}</span>
//                   </div>
//                 )}
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
//                   <Globe style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-indigo)' }} />
//                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
//                     {astrologer.languages?.map((l, i) => (
//                       <span
//                         key={l + i}
//                         style={{
//                           padding: '0.25rem 0.625rem',
//                           background: 'var(--color-indigo-light)',
//                           color: 'var(--color-indigo)',
//                           fontSize: '0.75rem',
//                           fontWeight: 500,
//                           borderRadius: '9999px',
//                         }}
//                       >
//                         {l}
//                       </span>
//                     ))}
//                   </div>
//                 </div>
//               </div>

//               <div style={{ display: 'flex', gap: '0.75rem' }}>
//                 <Button
//                   onClick={() => setIsEditModalOpen(true)}
//                   className="btn btn-outline"
//                   style={{ flex: 1, height: '3rem', fontSize: '1rem' }}
//                 >
//                   <Edit2 style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
//                   Edit Profile
//                 </Button>
//                 <Button
//                   onClick={toggleOnline}
//                   disabled={toggling}
//                   className={isOnline ? 'btn btn-success' : 'btn btn-outline'}
//                   style={{ flex: 1, height: '3rem', fontSize: '1rem' }}
//                 >
//                   {toggling ? (
//                     <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
//                   ) : isOnline ? (
//                     <ToggleRight style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
//                   ) : (
//                     <ToggleLeft style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
//                   )}
//                   {isOnline ? 'Online' : 'Go Online'}
//                 </Button>
//               </div>
//             </div>

//             {/* Right: Earnings + Stats */}
//             <div style={{ display: 'grid', gap: '1.5rem' }}>
//               {/* Earnings */}
//               <div className="card" style={{ padding: '1.5rem' }}>
//                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
//                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
//                     <Wallet style={{ width: '1.5rem', height: '1.5rem', color: 'var(--color-gold)' }} />
//                     <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Total Earnings</h3>
//                   </div>
//                   <TrendingUp style={{ width: '1.25rem', height: '1.25rem', color: '#10b981' }} />
//                 </div>
//                 <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#059669' }}>
//                   ₹{astrologer.earnings?.toFixed(2) || '0.00'}
//                 </p>
//                 <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginTop: '0.5rem' }}>
//                   This month: ₹{astrologer.monthlyEarnings || '0'}
//                 </p>
//               </div>

//               {/* Stats */}
//               <div className="card" style={{ padding: '1.5rem' }}>
//                 <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Performance</h3>
//                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
//                   <div>
//                     <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Total Calls</p>
//                     <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
//                       {astrologer.totalCalls || 0}
//                     </p>
//                   </div>
//                   <div>
//                     <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Avg Rating</p>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
//                       <Star style={{ width: '1rem', height: '1rem', fill: '#fbbf24', color: '#fbbf24' }} />
//                       <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
//                         {astrologer.rating || '0.0'}
//                       </span>
//                     </div>
//                   </div>
//                   <div>
//                     <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Rate/min</p>
//                     <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
//                       ₹{astrologer.pricing?.finalPrice || 0}
//                     </p>
//                   </div>
//                   <div>
//                     <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Reviews</p>
//                     <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>
//                       {astrologer.reviews || 0}
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Call History */}
//           <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
//             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
//               <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//                 <Clock style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-indigo)' }} />
//                 Recent Calls
//               </h3>
//               <Button
//                 onClick={() => router.push('/astrologer/call-history')}
//                 variant="ghost"
//                 style={{ fontSize: '0.875rem', color: 'var(--color-indigo)' }}
//               >
//                 View All
//               </Button>
//             </div>

//             {callHistory.length > 0 ? (
//               <div style={{ display: 'grid', gap: '0.75rem' }}>
//                 {callHistory.map((call) => (
//                   <div
//                     key={call.id}
//                     style={{
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'space-between',
//                       padding: '0.75rem',
//                       background: 'var(--color-gray-50)',
//                       borderRadius: '0.5rem',
//                     }}
//                   >
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
//                       <div
//                         style={{
//                           width: '2.5rem',
//                           height: '2.5rem',
//                           background: call.type === 'video' ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'linear-gradient(135deg, #10b981, #059669)',
//                           borderRadius: '50%',
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                           color: 'white',
//                           fontSize: '0.875rem',
//                         }}
//                       >
//                         {call.type === 'video' ? 'V' : 'A'}
//                       </div>
//                       <div>
//                         <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-gray-900)' }}>
//                           {call.userName || 'User'}
//                         </p>
//                         <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
//                           {new Date(call.startedAt).toLocaleString()}
//                         </p>
//                       </div>
//                     </div>
//                     <div style={{ textAlign: 'right' }}>
//                       <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#059669' }}>
//                         +₹{call.earning?.toFixed(2)}
//                       </p>
//                       <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
//                         {call.duration} min
//                       </p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p style={{ textAlign: 'center', color: 'var(--color-gray-500)', padding: '2rem 0' }}>
//                 No calls yet. Go online to receive calls!
//               </p>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Edit Profile Modal */}
//       <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profile">
//         <div style={{ padding: '1.5rem' }}>
//           <div style={{ marginBottom: '1rem' }}>
//             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
//               Full Name
//             </label>
//             <input
//               type="text"
//               value={editForm.name}
//               onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
//               style={inputStyle}
//             />
//           </div>

//           <div style={{ marginBottom: '1rem' }}>
//             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
//               Email
//             </label>
//             <input
//               type="email"
//               value={editForm.email}
//               onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
//               style={inputStyle}
//             />
//           </div>

//           <div style={{ marginBottom: '1rem' }}>
//             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
//               Phone
//             </label>
//             <input
//               type="tel"
//               value={editForm.phone}
//               onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
//               style={inputStyle}
//             />
//           </div>

//           <div style={{ marginBottom: '1rem' }}>
//             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
//               Specialization
//             </label>
//             <input
//               type="text"
//               value={editForm.specialization}
//               onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
//               style={inputStyle}
//             />
//           </div>

//           <div style={{ marginBottom: '1rem' }}>
//             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
//               Experience (e.g., 10+ years)
//             </label>
//             <input
//               type="text"
//               value={editForm.experience}
//               onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
//               style={inputStyle}
//             />
//           </div>

//           <div style={{ marginBottom: '1rem' }}>
//             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
//               Languages (comma separated)
//             </label>
//             <input
//               type="text"
//               value={editForm.languages.join(', ')}
//               onChange={(e) => setEditForm({ ...editForm, languages: e.target.value.split(',').map(l => l.trim()).filter(Boolean) })}
//               placeholder="Hindi, English, Tamil"
//               style={inputStyle}
//             />
//           </div>

//           <div style={{ marginBottom: '1rem' }}>
//             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
//               Rate per Minute (₹)
//             </label>
//             <input
//               type="number"
//               value={editForm.perMinuteCharge}
//               onChange={(e) => setEditForm({ ...editForm, perMinuteCharge: parseInt(e.target.value) || 0 })}
//               style={inputStyle}
//             />
//           </div>

//           <div style={{ marginBottom: '1.5rem' }}>
//             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
//               Bio
//             </label>
//             <textarea
//               value={editForm.bio}
//               onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
//               rows={3}
//               style={{ ...inputStyle, resize: 'vertical' }}
//             />
//           </div>

//           <div style={{ display: 'flex', gap: '0.75rem' }}>
//             <Button
//               onClick={handleSaveProfile}
//               disabled={saving}
//               className="btn btn-primary"
//               style={{ flex: 1, height: '3rem', fontSize: '1rem' }}
//             >
//               {saving ? (
//                 <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
//               ) : (
//                 <CheckCircle style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
//               )}
//               {saving ? 'Saving...' : 'Save Changes'}
//             </Button>
//             <Button
//               onClick={() => setIsEditModalOpen(false)}
//               variant="outline"
//               className="btn btn-outline"
//               style={{ flex: 1, height: '3rem', fontSize: '1rem' }}
//             >
//               Cancel
//             </Button>
//           </div>
//         </div>
//       </Modal>

//       {/* Local Styles */}
//       <style jsx>{`
//         @keyframes spin {
//           to { transform: rotate(360deg); }
//         }
//         .btn-success {
//           background: #10b981;
//           color: white;
//           border: none;
//         }
//         .btn-success:hover {
//           background: #059669;
//         }
//       `}</style>
//     </>
//   )
// }

// /* Reusable input style */
// const inputStyle = {
//   width: '100%',
//   padding: '0.75rem 1rem',
//   border: '1px solid var(--color-gray-300)',
//   borderRadius: '0.75rem',
//   fontSize: '1rem',
//   outline: 'none',
// }
// inputStyle[':focus'] = { borderColor: 'var(--color-gold)' }
