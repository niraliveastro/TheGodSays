"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import PhoneVerification from '@/components/PhoneVerification'
import { Calendar, Clock, Plus, X, Loader2, Save, ArrowLeft } from 'lucide-react'

export default function ManageAvailability() {
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSlot, setNewSlot] = useState({
    date: '',
    time: '',
    duration: 30
  })

  useEffect(() => {
    if (!authLoading && (!user || userProfile?.collection !== 'astrologers')) {
      router.push('/unauthorized')
      return
    }

    if (user && userProfile) {
      checkPhoneVerification()
      fetchAvailability()
    }
  }, [user, userProfile, authLoading])

  const checkPhoneVerification = async () => {
    try {
      const response = await fetch(`/api/user/profile?userId=${user.uid}&userType=astrologer`)
      if (response.ok) {
        const data = await response.json()
        if (data.user?.phoneVerified) {
          setPhoneVerified(true)
        }
      }
    } catch (error) {
      console.error('Error checking phone verification:', error)
    }
  }

  const fetchAvailability = async () => {
    try {
      const response = await fetch(`/api/appointments/availability?astrologerId=${user.uid}`)
      const data = await response.json()
      if (data.success) {
        setAvailability(data.availability || [])
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
      setError('Failed to load availability')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneVerified = (phone) => {
    setPhoneVerified(true)
  }

  const handleAddSlot = () => {
    if (!newSlot.date || !newSlot.time || !newSlot.duration) {
      setError('Please fill all fields')
      return
    }

    // Check if slot already exists
    const exists = availability.some(
      slot => slot.date === newSlot.date && slot.time === newSlot.time
    )

    if (exists) {
      setError('This slot already exists')
      return
    }

    setAvailability([...availability, { ...newSlot }])
    setNewSlot({ date: '', time: '', duration: 30 })
    setShowAddForm(false)
    setError('')
  }

  const handleRemoveSlot = (index) => {
    setAvailability(availability.filter((_, i) => i !== index))
  }

  const handleSaveAvailability = async () => {
    if (availability.length === 0) {
      setError('Please add at least one availability slot')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/appointments/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          astrologerId: user.uid,
          slots: availability
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Availability updated successfully!')
        setAvailability(data.slots || [])
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to update availability')
      }
    } catch (error) {
      console.error('Error saving availability:', error)
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  // Group slots by date
  const slotsByDate = {}
  availability.forEach(slot => {
    if (!slotsByDate[slot.date]) {
      slotsByDate[slot.date] = []
    }
    slotsByDate[slot.date].push(slot)
  })

  const sortedDates = Object.keys(slotsByDate).sort()

  if (authLoading || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#6366f1' }} />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        <button
          onClick={() => router.push('/astrologer-dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#6366f1',
            fontSize: '0.875rem'
          }}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div style={{
          backgroundColor: '#fff',
          borderRadius: '0.75rem',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 700,
            marginBottom: '0.5rem'
          }}>
            Manage Availability
          </h1>
          <p style={{
            color: '#6b7280',
            marginBottom: '2rem'
          }}>
            Add your available time slots for appointments. Users can book these slots.
          </p>

          {!phoneVerified && (
            <PhoneVerification
              userId={user?.uid}
              userType="astrologer"
              onVerified={handlePhoneVerified}
              required={true}
            />
          )}

          {phoneVerified && (
            <>
              {error && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  {success}
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  margin: 0
                }}>
                  Available Slots ({availability.length})
                </h2>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  <Plus size={16} />
                  Add Slot
                </button>
              </div>

              {showAddForm && (
                <div style={{
                  padding: '1.5rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    marginBottom: '1rem'
                  }}>
                    Add New Slot
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}>
                        Date
                      </label>
                      <input
                        type="date"
                        value={newSlot.date}
                        onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                        min={today}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}>
                        Time
                      </label>
                      <input
                        type="time"
                        value={newSlot.time}
                        onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}>
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={newSlot.duration}
                        onChange={(e) => setNewSlot({ ...newSlot, duration: parseInt(e.target.value) || 30 })}
                        min={15}
                        max={120}
                        step={15}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem'
                  }}>
                    <button
                      onClick={handleAddSlot}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false)
                        setNewSlot({ date: '', time: '', duration: 30 })
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {availability.length === 0 ? (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>No availability slots added yet. Click "Add Slot" to get started.</p>
                </div>
              ) : (
                <div style={{
                  marginBottom: '1.5rem'
                }}>
                  {sortedDates.map(date => {
                    const slots = slotsByDate[date]
                    const dateObj = new Date(date)
                    return (
                      <div
                        key={date}
                        style={{
                          marginBottom: '1rem',
                          padding: '1rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <h3 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          marginBottom: '0.75rem',
                          color: '#374151'
                        }}>
                          {dateObj.toLocaleDateString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h3>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                          gap: '0.5rem'
                        }}>
                          {slots.map((slot, index) => {
                            const globalIndex = availability.findIndex(
                              s => s.date === slot.date && s.time === slot.time
                            )
                            return (
                              <div
                                key={`${slot.date}_${slot.time}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.75rem',
                                  backgroundColor: '#fff',
                                  borderRadius: '0.5rem',
                                  border: '1px solid #e5e7eb'
                                }}
                              >
                                <div>
                                  <div style={{
                                    fontWeight: 500,
                                    fontSize: '0.875rem'
                                  }}>
                                    {new Date(`2000-01-01T${slot.time}`).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </div>
                                  <div style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280'
                                  }}>
                                    {slot.duration} min
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveSlot(globalIndex)}
                                  style={{
                                    padding: '0.25rem',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#dc2626'
                                  }}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={handleSaveAvailability}
                disabled={saving || availability.length === 0}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  backgroundColor: saving || availability.length === 0 ? '#9ca3af' : '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: saving || availability.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Availability</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

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

