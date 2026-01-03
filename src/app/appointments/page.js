"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Calendar, Clock, User, Phone, Video, MessageSquare, CheckCircle, X, Loader2 } from 'lucide-react'

export default function Appointments() {
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'upcoming', 'past', 'cancelled'
  const [cancelling, setCancelling] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/user')
      return
    }

    if (user && userProfile) {
      fetchAppointments()
    }
  }, [user, userProfile, authLoading])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const userType = userProfile?.collection === 'astrologers' ? 'astrologer' : 'user'
      const id = user.uid
      const url = userType === 'astrologer' 
        ? `/api/appointments?astrologerId=${id}`
        : `/api/appointments?userId=${id}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setAppointments(data.appointments || [])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return
    }

    setCancelling(appointmentId)
    try {
      const userType = userProfile?.collection === 'astrologers' ? 'astrologer' : 'user'
      const id = user.uid
      
      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          status: 'cancelled',
          [userType === 'astrologer' ? 'astrologerId' : 'userId']: id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        fetchAppointments()
      } else {
        alert(data.error || 'Failed to cancel appointment')
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert('Network error. Please try again.')
    } finally {
      setCancelling(null)
    }
  }

  const handleConnect = (appointment) => {
    // Store appointment details and redirect to call page
    localStorage.setItem('tgs:profileCallAstrologerId', appointment.astrologerId)
    localStorage.setItem('tgs:profileCallType', 'video')
    localStorage.setItem('tgs:appointmentId', appointment.id)
    
    // Redirect to talk-to-astrologer page which will handle the call
    router.push('/talk-to-astrologer')
  }

  const filteredAppointments = appointments.filter(appointment => {
    const now = new Date()
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`)
    
    if (filter === 'upcoming') {
      return appointment.status === 'confirmed' && appointmentDate > now
    } else if (filter === 'past') {
      return appointmentDate < now || appointment.status === 'completed'
    } else if (filter === 'cancelled') {
      return appointment.status === 'cancelled'
    }
    return true
  })

  const isAstrologer = userProfile?.collection === 'astrologers'

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
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 700,
          marginBottom: '2rem'
        }}>
          My Appointments
        </h1>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
          {['all', 'upcoming', 'past', 'cancelled'].map(filterOption => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: filter === filterOption ? '#6366f1' : '#fff',
                color: filter === filterOption ? '#fff' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'capitalize'
              }}
            >
              {filterOption}
            </button>
          ))}
        </div>

        {filteredAppointments.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: '#fff',
            borderRadius: '0.75rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.5, color: '#9ca3af' }} />
            <p style={{ color: '#6b7280' }}>
              {filter === 'all' 
                ? 'No appointments found.' 
                : `No ${filter} appointments found.`}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {filteredAppointments.map(appointment => {
              const appointmentDate = new Date(`${appointment.date}T${appointment.time}`)
              const isUpcoming = appointmentDate > new Date() && appointment.status === 'confirmed'
              const isPast = appointmentDate < new Date() || appointment.status === 'completed'
              
              return (
                <div
                  key={appointment.id}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: appointment.status === 'cancelled' 
                      ? '1px solid #fee2e2' 
                      : isUpcoming 
                        ? '1px solid #d1fae5' 
                        : '1px solid #e5e7eb'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <User size={18} style={{ color: '#6366f1' }} />
                        <span style={{
                          fontWeight: 600,
                          fontSize: '1.125rem'
                        }}>
                          {isAstrologer ? appointment.userName : appointment.astrologerName}
                        </span>
                        {appointment.status === 'confirmed' && isUpcoming && (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#d1fae5',
                            color: '#065f46',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}>
                            Upcoming
                          </span>
                        )}
                        {appointment.status === 'cancelled' && (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}>
                            Cancelled
                          </span>
                        )}
                        {appointment.status === 'completed' && (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}>
                            Completed
                          </span>
                        )}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        marginTop: '0.75rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#6b7280',
                          fontSize: '0.875rem'
                        }}>
                          <Calendar size={16} />
                          <span>
                            {appointmentDate.toLocaleDateString('en-IN', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#6b7280',
                          fontSize: '0.875rem'
                        }}>
                          <Clock size={16} />
                          <span>
                            {appointmentDate.toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })} ({appointment.duration} minutes)
                          </span>
                        </div>
                        {appointment.notes && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                            color: '#6b7280',
                            fontSize: '0.875rem',
                            marginTop: '0.5rem'
                          }}>
                            <MessageSquare size={16} style={{ marginTop: '0.125rem' }} />
                            <span>{appointment.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      alignItems: 'flex-end'
                    }}>
                      {isUpcoming && (
                        <button
                          onClick={() => handleConnect(appointment)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
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
                          <Video size={16} />
                          Connect
                        </button>
                      )}
                      {appointment.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelAppointment(appointment.id)}
                          disabled={cancelling === appointment.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: cancelling === appointment.id ? '#9ca3af' : '#fee2e2',
                            color: cancelling === appointment.id ? '#fff' : '#dc2626',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: cancelling === appointment.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 500
                          }}
                        >
                          {cancelling === appointment.id ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Cancelling...</span>
                            </>
                          ) : (
                            <>
                              <X size={16} />
                              <span>Cancel</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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

