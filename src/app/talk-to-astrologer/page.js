'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Video, Phone, Search, Filter, AlertCircle} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { collection, getDocs, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import CallConnectingNotification from '@/components/CallConnectingNotification'
import Modal from '@/components/Modal'
import ReviewModal from '@/components/ReviewModal'

export default function TalkToAstrologer() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSpecialization, setFilterSpecialization] = useState('')
  const [loading, setLoading] = useState(false)
  const [astrologers, setAstrologers] = useState([])
  const [fetchingAstrologers, setFetchingAstrologers] = useState(true)
  const [connectingCallType, setConnectingCallType] = useState(null) // 'video' or 'voice' or null
  const [callStatus, setCallStatus] = useState('connecting') // 'connecting' or 'rejected'
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false)
  const [balanceMessage, setBalanceMessage] = useState('')
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedAstrologer, setSelectedAstrologer] = useState(null)
  const router = useRouter()

  const fetchAndUpdateAstrologers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'astrologers'));
      const astrologersList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        astrologersList.push({
          id: doc.id,
          name: data.name,
          specialization: data.specialization,
          rating: data.rating || 0,
          reviews: data.reviews || 0,
          experience: data.experience,
          languages: data.languages || ['English'],
          isOnline: data.status === 'online',
          bio: data.bio || `Expert in ${data.specialization}`,
          verified: data.verified || false
        });
      });

      // Fetch pricing for all astrologers
      try {
        const pricingResponse = await fetch('/api/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-all-pricing' })
        });
        const pricingData = await pricingResponse.json();
        if (pricingData.success) {
          const pricingMap = {};
          pricingData.pricing.forEach(p => {
            pricingMap[p.astrologerId] = p;
          });
          // Merge pricing into astrologers
          astrologersList.forEach(astrologer => {
            const pricing = pricingMap[astrologer.id];
            if (pricing) {
              astrologer.pricing = pricing;
              astrologer.perMinuteCharge = pricing.pricingType === 'per_minute' ? pricing.finalPrice : null;
            } else {
              // Default pricing if not set
              astrologer.pricing = { pricingType: 'per_minute', finalPrice: 50 };
              astrologer.perMinuteCharge = 50;
            }
          });
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
        // Set default pricing for all
        astrologersList.forEach(astrologer => {
          astrologer.pricing = { pricingType: 'per_minute', finalPrice: 50 };
          astrologer.perMinuteCharge = 50;
        });
      }

      // Fetch actual reviews and recalculate ratings for accuracy
      const updatedAstrologersList = await Promise.all(astrologersList.map(async (astrologer) => {
        try {
          const reviewsResponse = await fetch(`/api/reviews?astrologerId=${astrologer.id}`);
          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json();
            if (reviewsData.success) {
              const totalReviews = reviewsData.reviews.length;
              const totalRating = reviewsData.reviews.reduce((sum, review) => sum + review.rating, 0);
              const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;
              return {
                ...astrologer,
                rating: parseFloat(averageRating),
                reviews: totalReviews
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching reviews for astrologer ${astrologer.id}:`, error);
        }
        return astrologer;
      }));

      setAstrologers(updatedAstrologersList);
      setFetchingAstrologers(false);
    } catch (error) {
      console.error('Error fetching astrologers:', error);
      setFetchingAstrologers(false);
    }
  };

  useEffect(() => {
    fetchAndUpdateAstrologers(); // Initial fetch
    const interval = setInterval(fetchAndUpdateAstrologers, 30000); // Fetch every 30 seconds

    return () => clearInterval(interval);
  }, [])

  const fetchAstrologers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'astrologers'))
      const astrologersList = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        astrologersList.push({
          id: doc.id,
          name: data.name,
          specialization: data.specialization,
          rating: data.rating || 0,
          reviews: data.reviews || 0,
          experience: data.experience,
          languages: data.languages || ['English'],
          isOnline: data.status === 'online',
          bio: data.bio || `Expert in ${data.specialization}`,
          verified: data.verified || false
        })
      })

      // Fetch actual reviews and recalculate ratings for accuracy
      const updatedAstrologersList = await Promise.all(astrologersList.map(async (astrologer) => {
        try {
          const reviewsResponse = await fetch(`/api/reviews?astrologerId=${astrologer.id}`);
          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json();
            if (reviewsData.success) {
              const totalReviews = reviewsData.reviews.length;
              const totalRating = reviewsData.reviews.reduce((sum, review) => sum + review.rating, 0);
              const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;
              return {
                ...astrologer,
                rating: parseFloat(averageRating),
                reviews: totalReviews
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching reviews for astrologer ${astrologer.id}:`, error);
        }
        return astrologer;
      }));

      // Fetch pricing for all astrologers
      try {
        const pricingResponse = await fetch('/api/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-all-pricing' })
        });
        const pricingData = await pricingResponse.json();
        if (pricingData.success) {
          const pricingMap = {};
          pricingData.pricing.forEach(p => {
            pricingMap[p.astrologerId] = p;
          });
          // Merge pricing into astrologers
          astrologersList.forEach(astrologer => {
            const pricing = pricingMap[astrologer.id];
            if (pricing) {
              astrologer.pricing = pricing;
              astrologer.perMinuteCharge = pricing.pricingType === 'per_minute' ? pricing.finalPrice : null;
            } else {
              // Default pricing if not set
              astrologer.pricing = { pricingType: 'per_minute', finalPrice: 50 };
              astrologer.perMinuteCharge = 50;
            }
          });
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
        // Set default pricing for all
        astrologersList.forEach(astrologer => {
          astrologer.pricing = { pricingType: 'per_minute', finalPrice: 50 };
          astrologer.perMinuteCharge = 50;
        });
      }

      setAstrologers(updatedAstrologersList)
    } catch (error) {
      console.error('Error fetching astrologers:', error)
    } finally {
      setFetchingAstrologers(false)
    }
  }

  const filteredAstrologers = astrologers.filter(astrologer => {
    const matchesSearch = astrologer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         astrologer.specialization.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = !filterSpecialization || astrologer.specialization === filterSpecialization
    return matchesSearch && matchesFilter
  })

  const handleVoiceCall = async (astrologerId) => {
    setLoading(true)
    try {
      // Use the actual astrologer ID from Firestore
      const backendAstrologerId = astrologerId
      const userId = localStorage.getItem('tgs:userId')

      if (!userId) {
        alert('User not authenticated. Please log in again.')
        router.push('/auth/user')
        return
      }

      // First check wallet balance before setting connecting modal
      const balanceResponse = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate-balance',
          userId,
          astrologerId: backendAstrologerId
        })
      })

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        if (balanceData.success && !balanceData.validation.hasBalance) {
          setBalanceMessage(`Insufficient wallet balance. Required: ₹${balanceData.validation.minimumRequired}, Available: ₹${balanceData.validation.currentBalance}. Please recharge your wallet.`)
          setIsBalanceModalOpen(true)
          setLoading(false)
          return
        }
      }

      // Only set connecting modal if balance is sufficient
      setConnectingCallType('voice')

      // Check astrologer availability
     const statusResponse = await fetch(`/api/astrologer/status?astrologerId=${backendAstrologerId}`)
      const statusData = await statusResponse.json()

      if (!statusData.success) {
        alert('Unable to check astrologer availability. Please try again later.')
        return
      }

      if (statusData.status === 'offline') {
        alert('Astrologer is currently offline. Please try again later.')
        return
      }

      if (statusData.status === 'busy') {
        if (!confirm('Astrologer is currently busy. You will be added to the waiting queue. Do you want to continue?')) {
          setLoading(false)
          return
        }
      }

      // Create voice call request
      const callResponse = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-call',
          astrologerId: backendAstrologerId,
          userId,
          callType: 'voice'
        })
      })

      if (!callResponse.ok) throw new Error('Failed to create voice call request')

      const callData = await callResponse.json()

      if (callData.success) {
        // Store call information in localStorage for billing settlement
        localStorage.setItem('tgs:callId', callData.call.id)
        localStorage.setItem('tgs:astrologerId', backendAstrologerId)

        // Initialize billing for the call
        try {
          await fetch('/api/billing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'initialize-call',
              callId: callData.call.id,
              userId,
              astrologerId: backendAstrologerId
            })
          })
        } catch (billingError) {
          console.error('Error initializing billing:', billingError)
          // Continue with call even if billing fails
        }

        // Set up polling to check call status
        let timeoutId
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/calls?astrologerId=${backendAstrologerId}`)
            const statusData = await statusResponse.json()

            if (statusData.success) {
              const call = statusData.calls.find(c => c.id === callData.call.id)

              if (call?.status === 'active') {
                clearInterval(pollInterval)
                clearTimeout(timeoutId)

                // Create LiveKit session for voice call and join room
                const sessionResponse = await fetch('/api/livekit/create-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    astrologerId: backendAstrologerId,
                    userId: callData.call.userId,
                    callId: callData.call.id,
                    roomName: call.roomName,
                    callType: 'voice',
                    role: 'user',
                    displayName: 'User'
                  })
                })

                if (sessionResponse.ok) {
                  const { roomName } = await sessionResponse.json()
                  setConnectingCallType(null)
                  router.push(`/talk-to-astrologer/voice/${roomName}`)
                } else {
                  alert('Failed to connect to voice call. Please try again.')
                }
              } else if (call?.status === 'rejected') {
                clearInterval(pollInterval)
                clearTimeout(timeoutId)
                // Cancel billing if call is rejected
                try {
                  await fetch('/api/billing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'cancel-call',
                      callId: callData.call.id
                    })
                  })
                } catch (cancelError) {
                  console.error('Error cancelling billing:', cancelError)
                }
                // Set rejection status and auto-close
                setCallStatus('rejected')
                setTimeout(() => {
                  setConnectingCallType(null)
                  setCallStatus('connecting')
                }, 2000)
              }
            }
          } catch (error) {
            console.error('Error checking call status:', error)
          }
        }, 2000)

        // Stop polling after 60 seconds
        timeoutId = setTimeout(() => {
          clearInterval(pollInterval)
          // Cancel billing if call times out
          try {
            fetch('/api/billing', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'cancel-call',
                callId: callData.call.id
              })
            })
          } catch (cancelError) {
            console.error('Error cancelling billing:', cancelError)
          }
          setConnectingCallType(null)
          alert('Astrologer is not responding. Please try again.')
          setLoading(false)
        }, 60000)
      }
    } catch (error) {
      console.error('Error starting voice call:', error)
      setConnectingCallType(null)
      alert('Failed to start voice call. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVideoCall = async (astrologerId) => {
    setLoading(true)
    try {
      // Use the actual astrologer ID from Firestore
      const backendAstrologerId = astrologerId
      const userId = localStorage.getItem('tgs:userId')

      if (!userId) {
        alert('User not authenticated. Please log in again.')
        router.push('/auth/user')
        return
      }

      // First check wallet balance before setting connecting modal
      const balanceResponse = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate-balance',
          userId,
          astrologerId: backendAstrologerId
        })
      })

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        if (balanceData.success && !balanceData.validation.hasBalance) {
          setBalanceMessage(`Insufficient wallet balance. Required: ₹${balanceData.validation.minimumRequired}, Available: ₹${balanceData.validation.currentBalance}. Please recharge your wallet.`)
          setIsBalanceModalOpen(true)
          setLoading(false)
          return
        }
      }

      // Only set connecting modal if balance is sufficient
      setConnectingCallType('video')

      // Check astrologer availability
      const statusResponse = await fetch(`/api/astrologer/status?astrologerId=${backendAstrologerId}`)
      const statusData = await statusResponse.json()

      if (!statusData.success) {
        alert('Unable to check astrologer availability. Please try again later.')
        return
      }

      if (statusData.status === 'offline') {
        alert('Astrologer is currently offline. Please try again later.')
        return
      }

      if (statusData.status === 'busy') {
        if (!confirm('Astrologer is currently busy. You will be added to the waiting queue. Do you want to continue?')) {
          setLoading(false)
          return
        }
      }

      // Create call request
      const callResponse = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-call',
          astrologerId: backendAstrologerId,
          userId
        })
      })

      if (!callResponse.ok) throw new Error('Failed to create call request')

      const callData = await callResponse.json()

      if (callData.success) {
        // Store call information in localStorage for billing settlement
        localStorage.setItem('tgs:callId', callData.call.id)
        localStorage.setItem('tgs:astrologerId', backendAstrologerId)

        // Initialize billing for the call
        try {
          await fetch('/api/billing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'initialize-call',
              callId: callData.call.id,
              userId,
              astrologerId: backendAstrologerId
            })
          })
        } catch (billingError) {
          console.error('Error initializing billing:', billingError)
          // Continue with call even if billing fails
        }

        // Set up polling to check call status
        let timeoutId
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/calls?astrologerId=${backendAstrologerId}`)
            const statusData = await statusResponse.json()

            if (statusData.success) {
              const call = statusData.calls.find(c => c.id === callData.call.id)

              if (call?.status === 'active') {
                clearInterval(pollInterval)
                clearTimeout(timeoutId)

                // Create LiveKit session and join room
                const sessionResponse = await fetch('/api/livekit/create-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    astrologerId: backendAstrologerId,
                    userId: callData.call.userId,
                    callId: callData.call.id,
                    roomName: call.roomName,
                    role: 'user',
                    displayName: 'User'
                  })
                })

                if (sessionResponse.ok) {
                  const { roomName } = await sessionResponse.json()
                  setConnectingCallType(null)
                  router.push(`/talk-to-astrologer/room/${roomName}`)
                } else {
                  alert('Failed to connect to video call. Please try again.')
                }
              } else if (call?.status === 'rejected') {
                clearInterval(pollInterval)
                clearTimeout(timeoutId)
                // Cancel billing if call is rejected
                try {
                  await fetch('/api/billing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'cancel-call',
                      callId: callData.call.id
                    })
                  })
                } catch (cancelError) {
                  console.error('Error cancelling billing:', cancelError)
                }
                // Set rejection status and auto-close
                setCallStatus('rejected')
                setTimeout(() => {
                  setConnectingCallType(null)
                  setCallStatus('connecting')
                }, 2000)
              }
            }
          } catch (error) {
            console.error('Error checking call status:', error)
          }
        }, 2000)

        // Stop polling after 60 seconds
        timeoutId = setTimeout(() => {
          clearInterval(pollInterval)
          // Cancel billing if call times out
          try {
            fetch('/api/billing', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'cancel-call',
                callId: callData.call.id
              })
            })
          } catch (cancelError) {
            console.error('Error cancelling billing:', cancelError)
          }
          setConnectingCallType(null)
          alert('Astrologer is not responding. Please try again.')
          setLoading(false)
        }, 60000)
      }
    } catch (error) {
      console.error('Error starting call:', error)
      setConnectingCallType(null)
      alert('Failed to start video call. Please try again.')
    } finally {
      setLoading(false)
    }
  }

return (
    <>
      <CallConnectingNotification
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
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ astrologerId, userId, rating, comment })
    })
    if (!response.ok) throw new Error('Failed to submit review')
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    // Success, data will update via snapshot
  }

  return (
      <div className="min-h-screen bg-gray-50 py-8">
      {/* Connection Status Modal */}
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

      <div className="container">
        {/* Header */}
        <header className="text-center" style={{ marginTop: '3rem' }}>
          <h1  style={{ fontSize: '2.75rem', fontWeight: 700 }}>Talk to Astrologer</h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--color-gray-600)', maxWidth: '48rem', margin: '0 auto' }}>
            Connect instantly with verified astrologers for guidance on love, career, health & life.
          </p>
        </header>

        {/* Search + Filter */}
        <div className="card" style={{marginTop: '1.5rem'}}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: 'var(--color-gold)' }} />
              <input
                type="text"
                placeholder="Search astrologer or specialization..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  border: '1px solid var(--color-gray-300)',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'var(--transition-fast)',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--color-gold)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--color-gray-300)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '16rem' }}>
              <Filter style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: 'var(--color-gold)' }} />
              <select
                value={filterSpecialization}
                onChange={e => setFilterSpecialization(e.target.value)}
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
                onFocus={e => {
                  e.target.style.borderColor = 'var(--color-gold)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.2)'
                }}
                onBlur={e => {
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

        {/* Loading Skeleton */}
        {fetchingAstrologers && (
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))' , marginTop: '1.5rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: '1.5rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
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

        {/* Astrologers Grid */}
        {!fetchingAstrologers && filteredAstrologers.length > 0 && (
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))', marginTop: '1.5rem' }}>
            {filteredAstrologers.map(a => (
              <div key={a.id} className="card" style={{ padding: '1.5rem', transition: 'var(--transition-smooth)', cursor: 'pointer' }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-xl), var(--shadow-glow)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg), var(--shadow-glow)'
                }}
              >
                {/* Avatar + Online + Verified */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '4rem', height: '4rem',
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 'bold', fontSize: '1.25rem'
                    }}>
                      {a.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div style={{
                      position: 'absolute', bottom: '-0.25rem', right: '-0.25rem',
                      width: '1.25rem', height: '1.25rem',
                      borderRadius: '50%', border: '2px solid white',
                      background: a.isOnline ? '#10b981' : 'var(--color-gray-400)',
                      animation: a.isOnline ? 'pulse 2s infinite' : 'none'
                    }} />
                  </div>

                  {a.verified && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--color-indigo-light)', color: 'var(--color-indigo)', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>
                      <CheckCircle style={{ width: '0.75rem', height: '0.75rem' }} />
                      Verified
                    </div>
                  )}
                </div>
              <div className="flex items-center space-x-2 mb-3">
                {astrologer.reviews > 0 ? (
                  <>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium text-gray-900 ml-1">{astrologer.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">({astrologer.reviews} reviews)</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">No reviews yet</span>
                )}
              </div>

                {/* Name & Spec */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{a.name}</h3>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-indigo)', marginBottom: '0.25rem' }}>{a.specialization}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginBottom: '0.75rem' }}>{a.experience}</p>

                {/* Rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Star style={{ width: '1rem', height: '1rem', fill: '#fbbf24', color: '#fbbf24' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>{a.rating}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>({a.reviews} reviews)</span>
                </div>

                {/* Price */}
                {a.perMinuteCharge && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#059669' }}>₹{a.perMinuteCharge}/min</span>
                  </div>
                )}

                {/* Bio */}
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {a.bio}
                </p>

                {/* Languages */}
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-gray-500)', marginBottom: '0.5rem' }}>Speaks:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {a.languages.map((l, i) => (
                      <span key={l + i} style={{ padding: '0.25rem 0.625rem', background: 'var(--color-indigo-light)', color: 'var(--color-indigo)', fontSize: '0.75rem', fontWeight: 500, borderRadius: '9999px' }}>
                        {l}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleVideoCall(a.id)}
                    disabled={!a.isOnline || loading}
                    className="btn btn-primary"
                    style={{ flex: 1, height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '1rem' }}
                  >
                    {loading && connectingCallType === 'video' ? (
                      <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Video style={{ width: '1rem', height: '1rem' }} />
                    )}
                    {a.isOnline ? 'Video Call' : 'Offline'}
                  </button>

                  <button
                    onClick={() => handleVoiceCall(a.id)}
                    disabled={!a.isOnline || loading}
                    className="btn btn-secondary"
                    style={{ flex: 1, height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '1rem' }}
                  >
                    {loading && connectingCallType === 'voice' ? (
                      <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Phone style={{ width: '1rem', height: '1rem' }} />
                    )}
                    {a.isOnline ? 'Voice Call' : 'Offline'}
                  </button>
                </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleOpenReview(astrologer)}
                  variant="outline"
                  className="mr-2"
                >
                  Review
                </Button>
                <Button
                  onClick={() => handleVideoCall(astrologer.id)}
                  disabled={!astrologer.isOnline || loading}
                  className={`flex-1 ${
                    astrologer.isOnline
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Video className="w-4 h-4 mr-2" />
                  {astrologer.isOnline ? 'Video Call' : 'Offline'}
                </Button>
                <Button
                  onClick={() => handleVoiceCall(astrologer.id)}
                  disabled={!astrologer.isOnline || loading}
                  variant="outline"
                  className={`flex-1 ${
                    astrologer.isOnline
                      ? 'border-green-600 text-green-600 hover:bg-green-50'
                      : 'border-gray-400 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  {astrologer.isOnline ? 'Voice Call' : 'Offline'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!fetchingAstrologers && filteredAstrologers.length === 0 && (
          <div className="text-center" style={{ padding: '4rem 0' }}>
            <div style={{ width: '6rem', height: '6rem', background: 'var(--color-gray-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Search style={{ width: '3rem', height: '3rem', color: 'var(--color-gray-400)' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: '0.5rem' }}>No Astrologers Found</h3>
            <p style={{ color: 'var(--color-gray-500)', maxWidth: '36rem', margin: '0 auto' }}>
              Try adjusting your search or filter to find the right astrologer for you.
            </p>
          </div>
        )}
      </div>

      {/* Balance Modal */}
      <Modal open={isBalanceModalOpen} onClose={() => setIsBalanceModalOpen(false)} title="Insufficient Balance">
        <div style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ width: '4rem', height: '4rem', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
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
      {/* Review Modal */}
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
  )
}