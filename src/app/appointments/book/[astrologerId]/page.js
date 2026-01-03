"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import PhoneVerification from '@/components/PhoneVerification'
import { Calendar, Clock, User, Phone, MessageSquare, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

export default function BookAppointment() {
  const params = useParams()
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()
  const astrologerId = params.astrologerId

  const [astrologer, setAstrologer] = useState(null)
  const [availability, setAvailability] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/user')
      return
    }

    if (user && userProfile) {
      checkPhoneVerification()
      fetchAstrologer()
      fetchAvailability()
    }
  }, [user, userProfile, authLoading])

  const checkPhoneVerification = async () => {
    try {
      const userRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userRef)
      if (userDoc.exists()) {
        const userData = userDoc.data()
        if (userData.phoneVerified) {
          setPhoneVerified(true)
        }
      }
    } catch (error) {
      console.error('Error checking phone verification:', error)
    }
  }

  const fetchAstrologer = async () => {
    try {
      const astrologerRef = doc(db, 'astrologers', astrologerId)
      const astrologerDoc = await getDoc(astrologerRef)
      if (astrologerDoc.exists()) {
        setAstrologer({ id: astrologerDoc.id, ...astrologerDoc.data() })
      } else {
        setError('Astrologer not found')
      }
    } catch (error) {
      console.error('Error fetching astrologer:', error)
      setError('Failed to load astrologer details')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailability = async () => {
    try {
      const response = await fetch(`/api/appointments/availability?astrologerId=${astrologerId}`)
      const data = await response.json()
      if (data.success) {
        setAvailability(data.availability || [])
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    }
  }

  const handlePhoneVerified = (phone) => {
    setPhoneVerified(true)
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setSelectedTime('')
  }

  const getAvailableTimesForDate = (date) => {
    return availability.filter(slot => slot.date === date)
  }

  const handleBookAppointment = async (e) => {
    e.preventDefault()
    setError('')
    setBooking(true)

    if (!phoneVerified) {
      setError('Please verify your phone number first')
      setBooking(false)
      return
    }

    if (!selectedDate || !selectedTime) {
      setError('Please select date and time')
      setBooking(false)
      return
    }

    try {
      const response = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          astrologerId,
          date: selectedDate,
          time: selectedTime,
          duration: selectedDuration,
          notes: notes.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/appointments')
        }, 3000)
      } else {
        setError(data.error || 'Failed to book appointment')
      }
    } catch (error) {
      console.error('Error booking appointment:', error)
      setError('Network error. Please try again.')
    } finally {
      setBooking(false)
    }
  }

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

  if (error && !astrologer) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <p style={{ color: '#dc2626' }}>{error}</p>
        <button
          onClick={() => router.back()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem'
      }}>
        <CheckCircle size={64} style={{ color: '#10b981' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
          Appointment Booked Successfully!
        </h2>
        <p style={{ color: '#6b7280', textAlign: 'center' }}>
          You will receive a WhatsApp confirmation shortly. Redirecting to appointments...
        </p>
      </div>
    )
  }

  // Group availability by date
  const datesWithSlots = {}
  availability.forEach(slot => {
    if (!datesWithSlots[slot.date]) {
      datesWithSlots[slot.date] = []
    }
    datesWithSlots[slot.date].push(slot)
  })

  const sortedDates = Object.keys(datesWithSlots).sort()

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <button
          onClick={() => router.back()}
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
          Back
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
            Book Appointment
          </h1>

          {astrologer && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.25rem',
                fontWeight: 600
              }}>
                {astrologer.name?.charAt(0) || 'A'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                  {astrologer.name}
                </h3>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                  {astrologer.specialization}
                </p>
              </div>
            </div>
          )}

          {!phoneVerified && (
            <PhoneVerification
              userId={user?.uid}
              userType="user"
              onVerified={handlePhoneVerified}
              required={true}
            />
          )}

          {phoneVerified && (
            <form onSubmit={handleBookAppointment}>
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

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 500
                }}>
                  <Calendar size={18} />
                  Select Date
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {sortedDates.map(date => {
                    const slots = datesWithSlots[date]
                    const dateObj = new Date(date)
                    const isSelected = selectedDate === date
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => handleDateSelect(date)}
                        style={{
                          padding: '0.75rem',
                          border: `2px solid ${isSelected ? '#6366f1' : '#d1d5db'}`,
                          borderRadius: '0.5rem',
                          backgroundColor: isSelected ? '#eef2ff' : '#fff',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? '#6366f1' : '#374151'
                        }}
                      >
                        <div>{dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {slots.length} slot{slots.length !== 1 ? 's' : ''}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {sortedDates.length === 0 && (
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    No available slots. Please check back later.
                  </p>
                )}
              </div>

              {selectedDate && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: 500
                  }}>
                    <Clock size={18} />
                    Select Time
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '0.5rem'
                  }}>
                    {getAvailableTimesForDate(selectedDate).map(slot => {
                      const isSelected = selectedTime === slot.time
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => {
                            setSelectedTime(slot.time)
                            setSelectedDuration(slot.duration || 30)
                          }}
                          style={{
                            padding: '0.75rem',
                            border: `2px solid ${isSelected ? '#6366f1' : '#d1d5db'}`,
                            borderRadius: '0.5rem',
                            backgroundColor: isSelected ? '#eef2ff' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? '#6366f1' : '#374151'
                          }}
                        >
                          {new Date(`2000-01-01T${slot.time}`).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedTime && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}>
                    Duration: {selectedDuration} minutes
                  </label>
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: 500
                }}>
                  <MessageSquare size={18} />
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific questions or concerns you'd like to discuss..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={booking || !selectedDate || !selectedTime}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  backgroundColor: booking || !selectedDate || !selectedTime ? '#9ca3af' : '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: booking || !selectedDate || !selectedTime ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {booking ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Booking...</span>
                  </>
                ) : (
                  'Book Appointment'
                )}
              </button>
            </form>
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

