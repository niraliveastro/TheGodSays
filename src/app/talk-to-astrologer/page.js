'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Star,
  Video,
  Phone,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import CallConnectingNotification from '@/components/CallConnectingNotification'
import Modal from '@/components/Modal'
import ReviewModal from '@/components/ReviewModal'
import Link from 'next/link'

export default function TalkToAstrologer() {
  /* --------------------------------------------------------------- */
  /*  State                                                          */
  /* --------------------------------------------------------------- */
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSpecialization, setFilterSpecialization] = useState('')
  const [astrologers, setAstrologers] = useState([])
  const [fetchingAstrologers, setFetchingAstrologers] = useState(true)
  const [connectingCallType, setConnectingCallType] = useState(null) // 'video' | 'voice' | null
  const [callStatus, setCallStatus] = useState('connecting')
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false)
  const [balanceMessage, setBalanceMessage] = useState('')
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedAstrologer, setSelectedAstrologer] = useState(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  /* --------------------------------------------------------------- */
  /*  Fetch astrologers + pricing + reviews                         */
  /* --------------------------------------------------------------- */
  const fetchAndUpdateAstrologers = async () => {
    try {
      const snap = await getDocs(collection(db, 'astrologers'))
      const list = snap.docs.map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          name: d.name,
          specialization: d.specialization,
          rating: d.rating || 0,
          reviews: d.reviews || 0,
          experience: d.experience,
          languages: d.languages || ['English'],
          isOnline: d.status === 'online',
          bio: d.bio || `Expert in ${d.specialization}`,
          verified: d.verified || false,
        }
      })

      /* ---- Pricing ---- */
      try {
        const res = await fetch('/api/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-all-pricing' }),
        })
        const data = await res.json()
        if (data.success) {
          const map = {}
          data.pricing.forEach((p) => (map[p.astrologerId] = p))
          list.forEach((a) => {
            const p = map[a.id]
            if (p) {
              a.pricing = p
              a.perMinuteCharge = p.pricingType === 'per_minute' ? p.finalPrice : null
            } else {
              a.pricing = { pricingType: 'per_minute', finalPrice: 50 }
              a.perMinuteCharge = 50
            }
          })
        }
      } catch (e) {
        console.error('Pricing fetch error:', e)
        list.forEach((a) => {
          a.pricing = { pricingType: 'per_minute', finalPrice: 50 }
          a.perMinuteCharge = 50
        })
      }

      /* ---- Reviews & rating recalc ---- */
      const updated = await Promise.all(
        list.map(async (a) => {
          try {
            const res = await fetch(`/api/reviews?astrologerId=${a.id}`)
            if (res.ok) {
              const { success, reviews } = await res.json()
              if (success) {
                const total = reviews.reduce((s, r) => s + r.rating, 0)
                const avg = reviews.length ? (total / reviews.length).toFixed(1) : 0
                return { ...a, rating: parseFloat(avg), reviews: reviews.length }
              }
            }
          } catch (e) {
            console.error(`Reviews error for ${a.id}:`, e)
          }
          return a
        })
      )

      setAstrologers(updated)
    } catch (e) {
      console.error('Astrologers fetch error:', e)
    } finally {
      setFetchingAstrologers(false)
    }
  }

  useEffect(() => {
    fetchAndUpdateAstrologers()
    const id = setInterval(fetchAndUpdateAstrologers, 30_000)
    return () => clearInterval(id)
  }, [])

  /* --------------------------------------------------------------- */
  /*  Filtering                                                      */
  /* --------------------------------------------------------------- */
  const filteredAstrologers = astrologers.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.specialization.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = !filterSpecialization || a.specialization === filterSpecialization
    return matchesSearch && matchesFilter
  })

  /* --------------------------------------------------------------- */
  /*  Voice / Video call handlers                                    */
  /* --------------------------------------------------------------- */
  const startCall = async (type, astrologerId) => {
    setLoading(true)
    try {
      const userId = localStorage.getItem('tgs:userId')
      if (!userId) {
        alert('Please log in first.')
        router.push('/auth/user')
        return
      }

      /* ---- Balance check ---- */
      const balRes = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate-balance',
          userId,
          astrologerId,
        }),
      })
      if (balRes.ok) {
        const { success, validation } = await balRes.json()
        if (success && !validation.hasBalance) {
          setBalanceMessage(
            `Insufficient balance. Need ₹${validation.minimumRequired}, you have ₹${validation.currentBalance}.`
          )
          setIsBalanceModalOpen(true)
          setLoading(false)
          return
        }
      }

      setConnectingCallType(type)

      /* ---- Availability ---- */
      const statusRes = await fetch(`/api/astrologer/status?astrologerId=${astrologerId}`)
      const { success, status } = await statusRes.json()

      if (!success) throw new Error('Cannot check astrologer status.')
      if (status === 'offline') throw new Error('Astrologer is offline.')
      if (status === 'busy' && !confirm('Astrologer is busy. Join queue?')) {
        setLoading(false)
        return
      }

      /* ---- Create call ---- */
      const callRes = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-call',
          astrologerId,
          userId,
          callType: type,
        }),
      })
      if (!callRes.ok) throw new Error('Failed to create call.')
      const { call } = await callRes.json()

      localStorage.setItem('tgs:callId', call.id)
      localStorage.setItem('tgs:astrologerId', astrologerId)

      /* ---- Init billing ---- */
      await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize-call',
          callId: call.id,
          userId,
          astrologerId,
        }),
      }).catch(() => {})

      /* ---- Poll status ---- */
      let timeoutId
      const poll = setInterval(async () => {
        const sRes = await fetch(`/api/calls?astrologerId=${astrologerId}`)
        const sData = await sRes.json()
        const c = sData.calls?.find((c) => c.id === call.id)

        if (c?.status === 'active') {
          clearInterval(poll)
          clearTimeout(timeoutId)
          const sessRes = await fetch('/api/livekit/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              astrologerId,
              userId,
              callId: call.id,
              roomName: c.roomName,
              callType: type,
              role: 'user',
              displayName: 'User',
            }),
          })
          if (sessRes.ok) {
            const { roomName } = await sessRes.json()
            setConnectingCallType(null)
            router.push(
              type === 'video'
                ? `/talk-to-astrologer/video/${roomName}`
                : `/talk-to-astrologer/voice/${roomName}`
            )
          } else {
            alert('Failed to join room.')
          }
        } else if (c?.status === 'rejected') {
          clearInterval(poll)
          clearTimeout(timeoutId)
          await fetch('/api/billing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'cancel-call', callId: call.id }),
          }).catch(() => {})
          setCallStatus('rejected')
          setTimeout(() => {
            setConnectingCallType(null)
            setCallStatus('connecting')
          }, 2000)
        }
      }, 2000)

      timeoutId = setTimeout(() => {
        clearInterval(poll)
        fetch('/api/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel-call', callId: call.id }),
        }).catch(() => {})
        setConnectingCallType(null)
        alert('Astrologer not responding.')
        setLoading(false)
      }, 60_000)
    } catch (e) {
      console.error(e)
      setConnectingCallType(null)
      alert(e.message || 'Call failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceCall = (id) => startCall('voice', id)
  const handleVideoCall = (id) => startCall('video', id)

  /* --------------------------------------------------------------- */
  /*  Review helpers                                                 */
  /* --------------------------------------------------------------- */
  const handleOpenReview = (astrologer) => {
    const userId = localStorage.getItem('tgs:userId')
    if (!userId) {
      alert('Please log in to leave a review.')
      router.push('/auth/user')
      return
    }
    setSelectedAstrologer(astrologer)
    setIsReviewModalOpen(true)
  }

  const handleSubmitReview = async ({ astrologerId, userId, rating, comment }) => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ astrologerId, userId, rating, comment }),
    })
    if (!res.ok) throw new Error('Failed to submit review')
    const data = await res.json()
    if (!data.success) throw new Error(data.message)
  }

  
  /* --------------------------------------------------------------- */
  /*  Render                                                         */
  /* --------------------------------------------------------------- */

  return (
    <>
      {/* Connection notification */}
      <CallConnectingNotification
        isOpen={!!connectingCallType}
        status={callStatus}
        type={connectingCallType}
        onTimeout={() => {
          setConnectingCallType(null)
          setCallStatus('connecting')
          alert('Connection timed out.')
        }}
      />

      <div style={{ minHeight: '100vh', background: 'var(--color-gray-50)', padding: '2rem 0' }}>
        <div className="container">

          {/* Header */}
          <header style={{ textAlign: 'center', marginTop: '3rem' }}>
            <h1 style={{ fontSize: '2.75rem', fontWeight: 700 }}>Talk to Astrologer</h1>
            <p
              style={{
                fontSize: '1.125rem',
                color: 'var(--color-gray-600)',
                maxWidth: '48rem',
                margin: '0 auto',
              }}
            >
              Connect instantly with verified astrologers for guidance on love,
              career, health & life.
            </p>
          </header>

          {/* Search + Filter */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1.25rem',
                    height: '1.25rem',
                    color: 'var(--color-gold)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search astrologer or specialization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    border: '1px solid var(--color-gray-300)',
                    borderRadius: '0.75rem',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'var(--transition-fast)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-gold)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-gray-300)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div style={{ position: 'relative', width: '100%', maxWidth: '16rem' }}>
                <Filter
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1.25rem',
                    height: '1.25rem',
                    color: 'var(--color-goldignition',
                  }}
                />
                <select
                  value={filterSpecialization}
                  onChange={(e) => setFilterSpecialization(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    border: '1px solid var(--color-gray-300)',
                    borderRadius: '0.75rem',
                    fontSize: '1rem',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.2em',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-gold)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-gray-300)'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  <option value="">All Specializations</option>
                  <option value="Vedic Astrology">Vedic Astrology</option>
                  <option value="Tarot Reading">Tarot Reading</option>
                  <option value="Numerology">Numerology</option>
                  <option value="Palmistry">Palmistry</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loading skeletons – 2 per row */}
          {fetchingAstrologers && (
            <div
              style={{
                display: 'grid',
                gap: '1.5rem',
                gridTemplateColumns: 'repeat(2, minmax(22rem, 1fr))',
                marginTop: '1.5rem',
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: '4rem', height: '4rem', background: 'var(--color-gray-200)', borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: '1.25rem', background: 'var(--color-gray-200)', borderRadius: '0.25rem', width: '8rem', marginBottom: '0.5rem' }} />
                      <div style={{ height: '1rem', background: 'var(--color-gray-200)', borderRadius: '0.25rem', width: '6rem' }} />
                    </div>
                  </div>
                  <div style={{ height: '1rem', background: 'var(--color-gray-200)', borderRadius: '0.25rem', marginBottom: '0.5rem' }} />
                  <div style={{ height: '1rem', background: 'var(--color-gray-200)', borderRadius: '0.25rem', width: '75%' }} />
                </div>
              ))}
            </div>
          )}

{!fetchingAstrologers && filteredAstrologers.length > 0 && (
  <div
    style={{
      display: 'grid',
      gap: '1.5rem',
      gridTemplateColumns: 'repeat(2, minmax(22rem, 1fr))',
      marginTop: '1.5rem',
    }}
  >
    {filteredAstrologers.map((a) => (
      <Link
        href={`/account/astrologer/${a.id}`}
        key={a.id}
        className="card group"
        style={{
          padding: '1.5rem',
          transition: 'var(--transition-smooth)',
          cursor: 'pointer',
          minWidth: '22rem',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          textDecoration: 'none',
          color: 'inherit',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = 'var(--shadow-xl), var(--shadow-glow)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'var(--shadow-lg), var(--shadow-glow)'
        }}
      >
        {/* Top Row: Avatar + Name + Spec + Rating */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem', position: 'relative', zIndex: 20 }}>
          {/* Avatar + Online */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: '4rem',
                height: '4rem',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.25rem',
              }}
            >
              {a.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: '-0.25rem',
                right: '-0.25rem',
                width: '1.25rem',
                height: '1.25rem',
                borderRadius: '50%',
                border: '2px solid white',
                background: a.isOnline ? '#10b981' : 'var(--color-gray-400)',
                animation: a.isOnline ? 'pulse 2s infinite' : 'none',
              }}
            />
          </div>

          {/* Name, Spec, Rating */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--color-gray-900)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={a.name}
                >
                  {a.name}
                </h3>
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-indigo)',
                    margin: '0.125rem 0 0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={a.specialization}
                >
                  {a.specialization}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  background: 'var(--color-amber-50)',
                  color: 'var(--color-amber-700)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Star style={{ width: '0.875rem', height: '0.875rem', fill: '#f59e0b', color: '#f59e0b' }} />
                {a.rating} <span style={{ color: 'var(--color-gray-500)', marginLeft: '0.125rem' }}>({a.reviews})</span>
              </div>
            </div>

            {a.verified && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'var(--color-indigo-light)',
                  color: 'var(--color-indigo)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  marginTop: '0.5rem',
                }}
              >
                <CheckCircle style={{ width: '0.75rem', height: '0.75rem' }} />
                Verified
              </div>
            )}
          </div>
        </div>

        {/* Rest of content */}
        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginBottom: '0.75rem', position: 'relative', zIndex: 20 }}>
          {a.experience}
        </p>

        {a.perMinuteCharge && (
          <div style={{ marginBottom: '0.75rem', position: 'relative', zIndex: 20 }}>
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#059669' }}>
              ₹{a.perMinuteCharge}/min
            </span>
          </div>
        )}

        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-gray-600)',
            marginBottom: '1rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 20,
          }}
        >
          {a.bio}
        </p>

        <div style={{ marginBottom: '1rem', position: 'relative', zIndex: 20 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-gray-500)', marginBottom: '0.5rem' }}>
            Speaks:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {a.languages.map((l, i) => (
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

        {/* Action buttons – Prevent click bubbling */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', position: 'relative', zIndex: 30 }}>
          <Button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleVideoCall(a.id)
            }}
            disabled={!a.isOnline || loading}
            className="btn btn-primary"
            style={{ flex: 1, height: '3rem', padding: '0 1.5rem', fontSize: '1rem' }}
          >
            {loading && connectingCallType === 'video' ? (
              <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
            ) : (
              <Video style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
            )}
            {a.isOnline ? 'Video Call' : 'Offline'}
          </Button>

          <Button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleVoiceCall(a.id)
            }}
            disabled={!a.isOnline || loading}
            variant="outline"
            className="btn btn-outline"
            style={{ flex: 1, height: '3rem', padding: '0 1.5rem', fontSize: '1rem' }}
          >
            {loading && connectingCallType === 'voice' ? (
              <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
            ) : (
              <Phone style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
            )}
            {a.isOnline ? 'Voice Call' : 'Offline'}
          </Button>

          <Button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleOpenReview(a)
            }}
            variant="outline"
            className="btn btn-outline"
            style={{ flex: 1, height: '3rem', padding: '0 1.5rem', fontSize: '1rem' }}
          >
            Review
          </Button>
        </div>
      </Link>
    ))}
  </div>
)}

          {/* Empty state */}
          {!fetchingAstrologers && filteredAstrologers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div
                style={{
                  width: '6rem',
                  height: '6rem',
                  background: 'var(--color-gray-100)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                <Search style={{ width: '3rem', height: '3rem', color: 'var(--color-gray-400)' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>
                No Astrologers Found
              </h3>
              <p style={{ color: 'var(--color-gray-500)', maxWidth: '36rem', margin: '0 auto' }}>
                Try adjusting your search or filter to find the right astrologer for you.
              </p>
            </div>
          )}
        </div>

        {/* Balance modal */}
        <Modal
          open={isBalanceModalOpen}
          onClose={() => setIsBalanceModalOpen(false)}
          title="Insufficient Balance"
        >
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div
              style={{
                width: '4rem',
                height: '4rem',
                background: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
              }}
            >
              <AlertCircle style={{ width: '2rem', height: '2rem', color: '#dc2626' }} />
            </div>
            <p style={{ color: 'var(--color-gray-700)', marginBottom: '1.5rem' }}>{balanceMessage}</p>
            <button
              onClick={() => {
                router.push('/wallet')
                setIsBalanceModalOpen(false)
              }}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem' }}
            >
              Recharge Wallet
            </button>
          </div>
        </Modal>

        {/* Review modal */}
        {selectedAstrologer && (
          <ReviewModal
            open={isReviewModalOpen}
            onClose={() => {
              setIsReviewModalOpen(false)
              setSelectedAstrologer(null)
            }}
            astrologerId={selectedAstrologer.id}
            astrologerName={selectedAstrologer.name}
            onSubmit={handleSubmitReview}
          />
        )}
      </div>

      {/* Local animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}