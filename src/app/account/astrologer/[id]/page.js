// app/astrologer/[id]/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Star, CheckCircle, Phone, Video, Languages, Globe, Award, Calendar, TrendingUp, MessageCircle, IndianRupee } from 'lucide-react'

export default function AstrologerProfile() {
  const params = useParams()
  const router = useRouter()
  const id = params.id

  const [astrologer, setAstrologer] = useState(null)
  const [perMinuteCharge, setPerMinuteCharge] = useState(50)
  const [rating, setRating] = useState(0)
  const [reviewsCount, setReviewsCount] = useState(0)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchAstrologerData() {
      if (!id) return

      try {
        setLoading(true)

        // ---------- Fetch astrologer from Firestore ----------
        const docRef = doc(db, 'astrologers', id)
        const snap = await getDoc(docRef)

        if (!snap.exists()) {
          setError('Astrologer not found')
          setLoading(false)
          return
        }

        const astrologerData = { id: snap.id, ...snap.data() }
        setAstrologer(astrologerData)

        // ---------- Fetch pricing ----------
        try {
          const pricingRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/pricing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get-pricing', astrologerId: id }),
          })
          if (pricingRes.ok) {
            const pricingData = await pricingRes.json()
            if (pricingData.success && pricingData.pricing?.pricingType === 'per_minute') {
              setPerMinuteCharge(pricingData.pricing.finalPrice)
            }
          }
        } catch (e) {
          console.error('Pricing fetch error:', e)
        }

        // ---------- Fetch reviews ----------
        try {
          const reviewsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/reviews?astrologerId=${id}`)
          if (reviewsRes.ok) {
            const reviewsData = await reviewsRes.json()
            if (reviewsData.success && reviewsData.reviews?.length) {
              const sum = reviewsData.reviews.reduce((s, r) => s + r.rating, 0)
              setRating((sum / reviewsData.reviews.length).toFixed(1))
              setReviewsCount(reviewsData.reviews.length)
              setReviews(reviewsData.reviews.slice(0, 3)) // Show only 3 reviews
            }
          }
        } catch (e) {
          console.error('Reviews fetch error:', e)
        }

        setLoading(false)
      } catch (err) {
        console.error('Error fetching astrologer:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    fetchAstrologerData()
  }, [id])

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--color-gray-50)'
      }}>
        <div className="spinner" style={{ 
          width: '48px', 
          height: '48px',
          border: '4px solid var(--color-gray-200)',
          borderTop: '4px solid var(--color-gold)',
          borderRadius: '50%'
        }} />
      </div>
    )
  }

  if (error || !astrologer) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--color-gray-50)'
      }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: 'var(--color-gray-900)', marginBottom: 'var(--space-md)' }}>
            Astrologer Not Found
          </h2>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-lg)' }}>
            {error || 'The astrologer you are looking for does not exist.'}
          </p>
          <button 
            onClick={() => router.push('/talk-to-astrologer')} 
            className="btn btn-primary"
          >
            Back to Astrologers
          </button>
        </div>
      </div>
    )
  }

  const isOnline = astrologer.status === 'online'
  
  const specialties = astrologer.specialties || ['']

  const achievements = [
    { icon: Award, label: 'Top Rated', value: rating ? `${rating}/5` : 'N/A' },
    { icon: Calendar, label: 'Experience', value: astrologer.experience || '10+ Years' },
    { icon: TrendingUp, label: 'Consultations', value: astrologer.consultations ? `${astrologer.consultations}+` : '1000+' },
    { icon: MessageCircle, label: 'Response Time', value: astrologer.responseTime || '5 mins' }
  ]

  const handleStartCall = (type) => {
    if (!isOnline) return
    window.open(`/talk-to-astrologer/${type}?astrologerId=${astrologer.id}`, '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-gray-50)' }}>
      {/* Header Navigation */}
      <div style={{ 
        background: 'var(--color-white)', 
        borderBottom: '1px solid var(--color-gray-200)'
      }}>
        <div className="container">
          <div style={{ padding: 'var(--space-md) 0' }}>
            <button 
              onClick={() => router.push('/astrologers')}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                color: 'var(--color-indigo)',
                fontSize: '0.875rem',
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <span style={{ transform: 'rotate(180deg)' }}>→</span>
              Back to Astrologers
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: 'var(--space-2xl) var(--space-lg)' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr',
          gap: 'var(--space-xl)',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--space-xl)'
            }}>
              
              {/* Left Side */}
              <div>
                {/* Profile Card */}
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                  {/* Hero Banner */}
                  <div style={{
                    height: '140px',
                    background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))',
                    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                    margin: 'calc(var(--space-xl) * -1) calc(var(--space-xl) * -1) 0',
                    position: 'relative'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-50px',
                      left: 'var(--space-xl)',
                      width: '120px',
                      height: '120px',
                      background: 'linear-gradient(135deg, var(--color-indigo), var(--color-purple))',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      border: '4px solid white',
                      boxShadow: 'var(--shadow-lg)'
                    }}>
                      {astrologer.name.split(' ').map(n => n[0]).join('')}
                      
                      {/* Online Status */}
                      {isOnline && (
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          width: '24px',
                          height: '24px',
                          background: '#10b981',
                          border: '3px solid white',
                          borderRadius: '50%',
                          animation: 'pulse 2s infinite'
                        }} />
                      )}
                    </div>

                    {/* Verified Badge */}
                    {astrologer.verified && (
                      <div style={{
                        position: 'absolute',
                        top: 'var(--space-md)',
                        right: 'var(--space-md)',
                        background: 'rgba(255, 255, 255, 0.95)',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--color-indigo)',
                        boxShadow: 'var(--shadow-md)'
                      }}>
                        <CheckCircle style={{ width: '16px', height: '16px' }} />
                        Verified Expert
                      </div>
                    )}
                  </div>

                  {/* Profile Info */}
                  <div style={{ paddingTop: '60px' }}>
                    <h1 style={{ 
                      fontSize: '2rem', 
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      color: 'var(--color-gray-900)'
                    }}>
                      {astrologer.name}
                    </h1>
                    
                    <p style={{ 
                      fontSize: '1.125rem',
                      color: 'var(--color-indigo)',
                      fontWeight: 500,
                      marginBottom: 'var(--space-md)'
                    }}>
                      {astrologer.specialization}
                    </p>

                    {/* Rating */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      marginBottom: 'var(--space-lg)',
                      paddingBottom: 'var(--space-lg)',
                      borderBottom: '1px solid var(--color-gray-200)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Star style={{ 
                          width: '20px', 
                          height: '20px', 
                          fill: '#f59e0b', 
                          color: '#f59e0b' 
                        }} />
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                          {rating || 'N/A'}
                        </span>
                      </div>
                      <span style={{ color: 'var(--color-gray-500)' }}>
                        ({reviewsCount.toLocaleString()} reviews)
                      </span>
                    </div>

                    {/* Quick Stats */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr',
                      gap: 'var(--space-md)',
                      marginBottom: 'var(--space-lg)'
                    }}>
                      {achievements.map((item, idx) => {
                        const IconComponent = item.icon
                        return (
                          <div key={idx} style={{
                            background: 'var(--color-gray-50)',
                            padding: 'var(--space-md)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-gray-200)'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem',
                              marginBottom: '0.25rem'
                            }}>
                              <IconComponent style={{ 
                                width: '16px', 
                                height: '16px',
                                color: 'var(--color-gold)'
                              }} />
                              <span style={{ 
                                fontSize: '0.75rem',
                                color: 'var(--color-gray-600)',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                {item.label}
                              </span>
                            </div>
                            <div style={{ 
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: 'var(--color-gray-900)'
                            }}>
                              {item.value}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Details */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: 'var(--space-md)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Languages style={{ 
                          width: '20px', 
                          height: '20px',
                          color: 'var(--color-indigo)'
                        }} />
                        <div>
                          <div style={{ 
                            fontSize: '0.875rem',
                            color: 'var(--color-gray-600)',
                            marginBottom: '0.125rem'
                          }}>
                            Languages
                          </div>
                          <div style={{ fontWeight: 500 }}>
                            {(astrologer.languages || ['English']).join(', ')}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Globe style={{ 
                          width: '20px', 
                          height: '20px',
                          color: 'var(--color-indigo)'
                        }} />
                        <div>
                          <div style={{ 
                            fontSize: '0.875rem',
                            color: 'var(--color-gray-600)',
                            marginBottom: '0.125rem'
                          }}>
                            Status
                          </div>
                          <div style={{ 
                            fontWeight: 500,
                            color: isOnline ? '#10b981' : 'var(--color-gray-700)'
                          }}>
                            {isOnline ? 'Available Now' : 'Offline'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <IndianRupee style={{ 
                          width: '20px', 
                          height: '20px',
                          color: 'var(--color-indigo)'
                        }} />
                        <div>
                          <div style={{ 
                            fontSize: '0.875rem',
                            color: 'var(--color-gray-600)',
                            marginBottom: '0.125rem'
                          }}>
                            Consultation Rate
                          </div>
                          <div style={{ 
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: '#059669'
                          }}>
                            ₹{perMinuteCharge}/min
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="card">
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 'var(--space-md)'
                  }}>
                    <button
                      className="btn btn-primary"
                      disabled={!isOnline}
                      onClick={() => handleStartCall('video')}
                      style={{ 
                        height: '52px',
                        fontSize: '1.05rem',
                        opacity: isOnline ? 1 : 0.5,
                        cursor: isOnline ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <Video style={{ width: '20px', height: '20px' }} />
                      Start Video Call
                    </button>

                    <button
                      className="btn btn-secondary"
                      disabled={!isOnline}
                      onClick={() => handleStartCall('voice')}
                      style={{ 
                        height: '52px',
                        fontSize: '1.05rem',
                        opacity: isOnline ? 1 : 0.5,
                        cursor: isOnline ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <Phone style={{ width: '20px', height: '20px' }} />
                      Start Voice Call
                    </button>

                    {!isOnline && (
                      <p style={{ 
                        fontSize: '0.875rem',
                        color: 'var(--color-gray-600)',
                        textAlign: 'center',
                        marginTop: '0.5rem'
                      }}>
                        Astrologer is currently offline
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side */}
              <div style={{ gridColumn: 'span 2' }}>
                {/* About Section */}
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                  <h2 style={{ 
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: 'var(--space-md)',
                    color: 'var(--color-gray-900)'
                  }}>
                    About
                  </h2>
                  <p style={{ 
                    color: 'var(--color-gray-700)',
                    lineHeight: 1.7,
                    marginBottom: 0
                  }}>
                    {astrologer.bio || `Expert in ${astrologer.specialization}. Providing guidance and insights to help you navigate life's journey.`}
                  </p>
                </div>

                {/* Specialties */}
                <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                  <h2 style={{ 
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: 'var(--space-md)',
                    color: 'var(--color-gray-900)'
                  }}>
                    Areas of Expertise
                  </h2>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '0.75rem' 
                  }}>
                    {specialties.map((specialty, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.5rem 1rem',
                          background: 'var(--color-indigo-light)',
                          color: 'var(--color-indigo)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          border: '1px solid rgba(79, 70, 229, 0.2)'
                        }}
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Reviews */}
                <div className="card">
                  <h2 style={{ 
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: 'var(--space-lg)',
                    color: 'var(--color-gray-900)'
                  }}>
                    Recent Reviews
                  </h2>
                  
                  {reviews.length > 0 ? (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 'var(--space-lg)' 
                    }}>
                      {reviews.map((review, index) => (
                        <div
                          key={review.id || index}
                          style={{
                            paddingBottom: 'var(--space-lg)',
                            borderBottom: index !== reviews.length - 1 ? '1px solid var(--color-gray-200)' : 'none'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'start',
                            marginBottom: '0.75rem'
                          }}>
                            <div>
                              <div style={{ 
                                fontWeight: 600,
                                marginBottom: '0.25rem'
                              }}>
                                {review.userName || review.name || 'Anonymous'}
                              </div>
                              <div style={{ 
                                fontSize: '0.875rem',
                                color: 'var(--color-gray-500)'
                              }}>
                                {review.createdAt ? new Date(review.createdAt.toDate ? review.createdAt.toDate() : review.createdAt).toLocaleDateString() : review.date}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    fill: i < review.rating ? '#f59e0b' : 'none',
                                    color: i < review.rating ? '#f59e0b' : 'var(--color-gray-300)'
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <p style={{ 
                            color: 'var(--color-gray-700)',
                            lineHeight: 1.6,
                            marginBottom: 0
                          }}>
                            {review.comment || review.review}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ 
                      color: 'var(--color-gray-500)',
                      textAlign: 'center',
                      padding: 'var(--space-xl) 0'
                    }}>
                      No reviews yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pulse animation for online status */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}