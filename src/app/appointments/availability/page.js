"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import PhoneVerification from '@/components/PhoneVerification'
import { Calendar, Clock, Plus, X, Loader2, Save, ArrowLeft, Power, PowerOff, CalendarCheck } from 'lucide-react'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DEFAULT_START_TIME = '09:00'
const DEFAULT_END_TIME = '21:00'
const DEFAULT_DURATION = 30 // minutes

// Generate time slots for a day based on duration
function generateTimeSlots(startTime, endTime, duration) {
  const slots = []
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  for (let time = startMinutes; time < endMinutes; time += duration) {
    const hours = Math.floor(time / 60)
    const minutes = time % 60
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    slots.push(timeString)
  }
  
  return slots
}

// Get next occurrence of a weekday
function getNextWeekday(weekdayName) {
  const today = new Date()
  const currentDay = today.getDay()
  const targetDay = WEEKDAYS.indexOf(weekdayName)
  
  let daysUntilTarget = targetDay - currentDay
  if (daysUntilTarget < 0) {
    daysUntilTarget += 7
  } else if (daysUntilTarget === 0) {
    // If today is the target day, use next week
    daysUntilTarget = 7
  }
  
  const nextDate = new Date(today)
  nextDate.setDate(today.getDate() + daysUntilTarget)
  return nextDate.toISOString().split('T')[0]
}

export default function ManageAvailability() {
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [availability, setAvailability] = useState([])
  const [bookedSlots, setBookedSlots] = useState(new Set()) // Track booked slots
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Template settings
  const [slotDuration, setSlotDuration] = useState(DEFAULT_DURATION)
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME)
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME)
  const [enabledDays, setEnabledDays] = useState(new Set(WEEKDAYS)) // All days enabled by default
  
  // Week view - show next 4 weeks
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [generateWeeks, setGenerateWeeks] = useState(1) // Number of weeks to generate

  useEffect(() => {
    if (!authLoading && (!user || userProfile?.collection !== 'astrologers')) {
      router.push('/unauthorized')
      return
    }

    if (user && userProfile) {
      checkPhoneVerification()
      fetchAvailability()
      fetchBookedSlots()
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
        // Filter out past slots when fetching
        const now = new Date()
        const filtered = (data.availability || []).filter(slot => {
          const [hours, minutes] = slot.time.split(':').map(Number)
          const slotDate = new Date(slot.date)
          slotDate.setHours(hours, minutes, 0, 0)
          return slotDate.getTime() > now.getTime()
        })
        setAvailability(filtered)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
      setError('Failed to load availability')
    } finally {
      setLoading(false)
    }
  }

  const fetchBookedSlots = async () => {
    try {
      const response = await fetch(`/api/appointments?astrologerId=${user.uid}&status=confirmed`)
      const data = await response.json()
      if (data.success && data.appointments) {
        const booked = new Set()
        data.appointments.forEach(apt => {
          if (apt.status === 'confirmed' || apt.status === 'pending') {
            booked.add(`${apt.date}_${apt.time}`)
          }
        })
        setBookedSlots(booked)
      }
    } catch (error) {
      console.error('Error fetching booked slots:', error)
    }
  }

  const handlePhoneVerified = (phone) => {
    setPhoneVerified(true)
  }

  // Toggle day on/off
  const toggleDay = (dayName) => {
    const newEnabledDays = new Set(enabledDays)
    if (newEnabledDays.has(dayName)) {
      newEnabledDays.delete(dayName)
      // Remove all slots for this day
      setAvailability(prev => prev.filter(slot => {
        const slotDate = new Date(slot.date)
        const slotDayName = slotDate.toLocaleDateString('en-US', { weekday: 'long' })
        return slotDayName !== dayName
      }))
    } else {
      newEnabledDays.add(dayName)
    }
    setEnabledDays(newEnabledDays)
  }

  // Generate slots for dates in current week view that match enabled weekdays
  const generateAllSlots = () => {
    const newSlots = []
    // Get current date/time ONCE at the start - this is the reference point
    // Add 1 minute buffer to ensure we don't include slots that are too close to now
    const currentTime = new Date()
    currentTime.setSeconds(0, 0)
    currentTime.setMilliseconds(0)
    // Add 1 minute to current time to ensure we only get slots that are at least 1 minute in the future
    const currentTimestamp = currentTime.getTime() + (60 * 1000) // Add 1 minute in milliseconds
    
    // Get current date (midnight) for date comparisons
    const today = new Date(currentTime)
    today.setHours(0, 0, 0, 0)
    
    const currentDayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days until end of current week (Sunday)
    const daysUntilSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek
    
    // Generate for multiple weeks
    for (let weekOffset = 0; weekOffset < generateWeeks; weekOffset++) {
      if (weekOffset === 0) {
        // First week: Generate from TODAY to end of current week (Sunday)
        for (let dayOffset = 0; dayOffset <= daysUntilSunday; dayOffset++) {
          const dateObj = new Date(today)
          dateObj.setDate(today.getDate() + dayOffset)
          const date = dateObj.toISOString().split('T')[0]
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
          
          // Only generate for enabled days
          if (enabledDays.has(dayName)) {
            const timeSlots = generateTimeSlots(startTime, endTime, slotDuration)
            
            timeSlots.forEach(time => {
              // Create slot datetime - use the date string to avoid timezone issues
              // Format: "YYYY-MM-DDTHH:MM:00" (ISO format)
              const slotDateTime = new Date(`${date}T${time}:00`)
              
              // Ensure we have a valid date
              if (isNaN(slotDateTime.getTime())) {
                console.error(`Invalid date/time: ${date} ${time}`)
                return
              }
              
              const slotTimestamp = slotDateTime.getTime()
              
              // CRITICAL CHECK: Only add slots that are in the future
              // Compare timestamps - slot must be AFTER current time (with 1 minute buffer)
              if (slotTimestamp > currentTimestamp) {
                newSlots.push({
                  date,
                  time,
                  duration: slotDuration,
                  available: true
                })
              }
              // If slotTimestamp <= currentTimestamp, skip it (it's in the past)
            })
          }
        }
      } else {
        // Subsequent weeks: Generate full week (Monday to Sunday)
        // Calculate Monday of the next week
        const nextMonday = new Date(today)
        const daysToNextMonday = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek
        nextMonday.setDate(today.getDate() + daysToNextMonday + ((weekOffset - 1) * 7))
        nextMonday.setHours(0, 0, 0, 0)
        
        // Generate for all 7 days (Monday-Sunday) - all are future dates
        for (let i = 0; i < 7; i++) {
          const dateObj = new Date(nextMonday)
          dateObj.setDate(nextMonday.getDate() + i)
          const date = dateObj.toISOString().split('T')[0]
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
          
          // Only generate for enabled days
          if (enabledDays.has(dayName)) {
            const timeSlots = generateTimeSlots(startTime, endTime, slotDuration)
            timeSlots.forEach(time => {
              // For future dates, all slots are valid (all are in the future)
              newSlots.push({
                date,
                time,
                duration: slotDuration,
                available: true
              })
            })
          }
        }
      }
    }

    // Merge with existing slots, avoiding duplicates and filtering out past slots
    setAvailability(prev => {
      // Get current time for filtering
      const now = new Date()
      now.setSeconds(0, 0)
      now.setMilliseconds(0)
      const nowTimestamp = now.getTime() + (60 * 1000) // Add 1 minute buffer
      
      // Filter out past slots from existing availability
      const validExisting = prev.filter(slot => {
        const slotDateTime = new Date(`${slot.date}T${slot.time}:00`)
        if (isNaN(slotDateTime.getTime())) {
          return false
        }
        return slotDateTime.getTime() > nowTimestamp
      })
      
      const existing = new Set(validExisting.map(s => `${s.date}_${s.time}`))
      const toAdd = newSlots.filter(s => !existing.has(`${s.date}_${s.time}`))
      return [...validExisting, ...toAdd]
    })
    
    setSuccess(`Generated ${newSlots.length} slots for ${generateWeeks} week(s)!`)
    setTimeout(() => setSuccess(''), 3000)
  }

  // Toggle slot availability (click handler)
  const toggleSlotAvailability = (date, time) => {
    const slotKey = `${date}_${time}`
    
    // Don't allow toggling booked slots
    if (bookedSlots.has(slotKey)) {
      setError('Cannot modify booked slots')
      setTimeout(() => setError(''), 3000)
      return
    }

    setAvailability(prev => {
      const index = prev.findIndex(s => s.date === date && s.time === time)
      if (index === -1) {
        // Slot doesn't exist, add it as unavailable
        return [...prev, { date, time, duration: slotDuration, available: false }]
      } else {
        // Toggle availability
        const updated = [...prev]
        updated[index] = { ...updated[index], available: !updated[index].available }
        return updated
      }
    })
  }

  // Remove slot completely
  const removeSlot = (date, time) => {
    const slotKey = `${date}_${time}`
    if (bookedSlots.has(slotKey)) {
      setError('Cannot remove booked slots')
      setTimeout(() => setError(''), 3000)
      return
    }
    setAvailability(prev => prev.filter(s => !(s.date === date && s.time === time)))
  }

  const handleSaveAvailability = async () => {
    // Filter out unavailable slots (or keep them but mark as unavailable)
    const slotsToSave = availability.filter(slot => slot.available !== false)
    
    if (slotsToSave.length === 0) {
      setError('Please add at least one available slot')
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
          slots: slotsToSave
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Availability updated successfully!')
        setAvailability(data.slots || [])
        setTimeout(() => setSuccess(''), 3000)
        fetchBookedSlots() // Refresh booked slots
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

  // Get dates for current week view
  const getWeekDates = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (currentWeekOffset * 7)) // Monday
    
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    return dates
  }

  const weekDates = getWeekDates()

  // Get slots for a specific date
  const getSlotsForDate = (date) => {
    return availability.filter(slot => slot.date === date)
  }

  // Check if slot is booked
  const isSlotBooked = (date, time) => {
    return bookedSlots.has(`${date}_${time}`)
  }

  // Get slot status for styling
  const getSlotStatus = (slot) => {
    if (isSlotBooked(slot.date, slot.time)) {
      return 'booked' // Grey
    }
    if (slot.available === false) {
      return 'unavailable' // Red
    }
    return 'available' // Golden
  }

  const allTimeSlots = generateTimeSlots(startTime, endTime, slotDuration)

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
        maxWidth: '1400px',
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
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
            Create and manage your available time slots. Click on slots to toggle availability.
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

              {/* Template Settings */}
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                marginBottom: '2rem',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CalendarCheck size={20} />
                  Quick Template Setup
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}>
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
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
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
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
                      Slot Duration (minutes)
                    </label>
                    <select
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '1rem'
                      }}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}>
                      Generate for (weeks)
                    </label>
                    <select
                      value={generateWeeks}
                      onChange={(e) => setGenerateWeeks(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '1rem'
                      }}
                    >
                      <option value={1}>1 week</option>
                      <option value={2}>2 weeks</option>
                      <option value={4}>4 weeks</option>
                      <option value={8}>8 weeks</option>
                    </select>
                  </div>
                </div>

                {/* Day Toggles */}
                <div style={{
                  marginBottom: '1.5rem'
                }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}>
                    Select Days
                  </label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    {WEEKDAYS.map(day => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          backgroundColor: enabledDays.has(day) ? '#10b981' : '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        {enabledDays.has(day) ? <Power size={16} /> : <PowerOff size={16} />}
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={generateAllSlots}
                  disabled={enabledDays.size === 0}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: enabledDays.size === 0 ? '#9ca3af' : '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: enabledDays.size === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    margin: '0 auto'
                  }}
                >
                  <Plus size={18} />
                  Generate Slots
                </button>
                <p style={{
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '0.5rem'
                }}>
                  Slots will be generated for enabled days for {generateWeeks} week{generateWeeks > 1 ? 's' : ''} ahead
                </p>
              </div>

              {/* Week View Navigation */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <button
                  onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  ← Previous Week
                </button>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  margin: 0
                }}>
                  Week {currentWeekOffset === 0 ? '(Current)' : `+${currentWeekOffset}`}
                </h2>
                <button
                  onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Next Week →
                </button>
              </div>

              {/* Calendar Grid */}
              <div style={{
                overflowX: 'auto',
                marginBottom: '2rem'
              }}>
                <div style={{
                  position: 'relative',
                  maxHeight: '480px', // Fixed height for ~8 slots (60px per slot)
                  overflowY: 'auto',
                  overflowX: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    minWidth: '800px'
                  }}>
                    <thead style={{
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#fff',
                      zIndex: 10,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <tr>
                        <th style={{
                          padding: '0.75rem',
                          textAlign: 'left',
                          borderBottom: '2px solid #e5e7eb',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#374151',
                          width: '120px',
                          backgroundColor: '#fff'
                        }}>
                          Time
                        </th>
                        {weekDates.map((date, idx) => {
                          const dateObj = new Date(date)
                          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
                          const dayNum = dateObj.getDate()
                          const isToday = date === new Date().toISOString().split('T')[0]
                          return (
                            <th
                              key={date}
                              style={{
                                padding: '0.75rem',
                                textAlign: 'center',
                                borderBottom: '2px solid #e5e7eb',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: '#374151',
                                backgroundColor: isToday ? '#eff6ff' : '#fff'
                              }}
                            >
                              <div>{dayName}</div>
                              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{dayNum}</div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {allTimeSlots.map(time => (
                        <tr key={time}>
                          <td style={{
                            padding: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#6b7280',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: '#fff'
                          }}>
                            {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </td>
                          {weekDates.map(date => {
                            const slot = availability.find(s => s.date === date && s.time === time)
                            const status = slot ? getSlotStatus(slot) : 'none'
                            const isBooked = isSlotBooked(date, time)
                            
                            return (
                              <td
                                key={`${date}_${time}`}
                                style={{
                                  padding: '0.25rem',
                                  borderBottom: '1px solid #e5e7eb',
                                  cursor: isBooked ? 'not-allowed' : 'pointer',
                                  position: 'relative',
                                  backgroundColor: '#fff'
                                }}
                                onClick={() => !isBooked && toggleSlotAvailability(date, time)}
                                onMouseEnter={(e) => {
                                  if (!isBooked) {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fff'
                                }}
                              >
                                {slot && (
                                  <div
                                    style={{
                                      padding: '0.5rem',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      textAlign: 'center',
                                      backgroundColor:
                                        status === 'booked' ? '#9ca3af' : // Grey for booked
                                        status === 'unavailable' ? '#fee2e2' : // Red for unavailable
                                        '#fef3c7', // Golden for available
                                      color:
                                        status === 'booked' ? '#fff' :
                                        status === 'unavailable' ? '#dc2626' :
                                        '#92400e',
                                      border:
                                        status === 'booked' ? '1px solid #6b7280' :
                                        status === 'unavailable' ? '1px solid #fca5a5' :
                                        '1px solid #fbbf24',
                                      minHeight: '40px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      position: 'relative'
                                    }}
                                  >
                                    {status === 'booked' && 'Booked'}
                                    {status === 'unavailable' && 'Unavailable'}
                                    {status === 'available' && 'Available'}
                                    {!isBooked && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          removeSlot(date, time)
                                        }}
                                        style={{
                                          position: 'absolute',
                                          top: '2px',
                                          right: '2px',
                                          padding: '0.125rem',
                                          backgroundColor: 'rgba(0,0,0,0.1)',
                                          border: 'none',
                                          borderRadius: '0.25rem',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Legend */}
              <div style={{
                display: 'flex',
                gap: '1.5rem',
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '0.25rem'
                  }} />
                  <span>Available (Golden)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: '#9ca3af',
                    border: '1px solid #6b7280',
                    borderRadius: '0.25rem'
                  }} />
                  <span>Booked (Grey)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '0.25rem'
                  }} />
                  <span>Unavailable (Red)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 'auto' }}>
                  Click on slots to toggle availability
                </div>
              </div>

              <button
                onClick={handleSaveAvailability}
                disabled={saving || availability.filter(s => s.available !== false).length === 0}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  backgroundColor: saving || availability.filter(s => s.available !== false).length === 0 ? '#9ca3af' : '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: saving || availability.filter(s => s.available !== false).length === 0 ? 'not-allowed' : 'pointer',
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
                    <span>Save Availability ({availability.filter(s => s.available !== false).length} available slots)</span>
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
