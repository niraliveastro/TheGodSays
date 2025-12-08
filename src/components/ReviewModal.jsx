'use client'

import { useState, useEffect } from 'react'
import { Star, User, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Modal from '@/components/Modal'
import { useAuth } from '@/contexts/AuthContext'

export default function ReviewModal({ open, onClose, astrologerId, astrologerName, onSubmit }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [filter, setFilter] = useState('All')
  const { user } = useAuth()

  const handleStarClick = (i) => setRating(i + 1)

  const fetchReviews = async () => {
    if (!astrologerId) return
    setLoadingReviews(true)
    try {
      const res = await fetch(`/api/reviews?astrologerId=${astrologerId}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setReviews(data.reviews || [])
      } else {
        // Handle 503 or other errors gracefully
        console.warn('Failed to fetch reviews:', data.message || 'Unknown error')
        setReviews([]) // Set empty array to prevent UI breaking
      }
    } catch (e) {
      console.error('Error fetching reviews:', e)
      setReviews([]) // Set empty array on error
    } finally {
      setLoadingReviews(false)
    }
  }

  useEffect(() => {
    if (open && astrologerId) fetchReviews()
  }, [open, astrologerId])

  const filteredReviews = reviews.filter(r =>
    filter === 'All' ? true : r.rating === parseInt(filter)
  )

  const handleSubmit = async () => {
    if (rating === 0) return alert('Please select a rating.')
    setSubmitting(true)
    try {
      const userId = user?.uid || localStorage.getItem('tgs:userId')
      if (!userId) return alert('User not authenticated.')
      await onSubmit({ astrologerId, userId, rating, comment })
      setRating(0)
      setComment('')
      fetchReviews()
    } catch (e) {
      alert('Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Delete this review?')) return
    try {
      const res = await fetch(`/api/reviews?astrologerId=${astrologerId}&reviewId=${reviewId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      fetchReviews()
    } catch (e) {
      alert('Failed to delete review.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Reviews for ${astrologerName}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ---------- SUBMIT FORM ---------- */}
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            Submit Your Review
          </h3>

          {/* Rating */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
              Rating
            </label>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  style={{
                    width: '2rem',
                    height: '2rem',
                    cursor: 'pointer',
                    fill: i < rating ? '#facc15' : 'none',
                    color: i < rating ? '#facc15' : '#d1d5db',
                  }}
                  onClick={() => handleStarClick(i)}
                />
              ))}
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>
              {rating} out of 5 stars
            </p>
          </div>

          {/* Comment + Submit */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '0.5rem',
                background: 'var(--color-white)',
                fontSize: '1rem',
                resize: 'none',
                minHeight: '4rem',
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary"
              style={{ height: 'fit-content', padding: '0.75rem 1.5rem' }}
            >
              {submitting ? (
                <>
                  <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
                  Submitting...
                </>
              ) : (
                'Send'
              )}
            </Button>
          </div>
        </div>

        {/* ---------- REVIEWS PANEL ---------- */}
        <div style={{ borderTop: '1px solid var(--color-gray-200)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Reviews</h3>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '0.5rem',
                background: 'var(--color-white)',
              }}
            >
              <option value="All">All Ratings</option>
              {[5, 4, 3, 2, 1].map(n => (
                <option key={n} value={n}>{n} Stars</option>
              ))}
            </select>
          </div>

          {loadingReviews ? (
            <p style={{ textAlign: 'center', color: 'var(--color-gray-500)' }}>
              <Loader2 style={{ display: 'inline-block', width: '1rem', height: '1rem', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
              Loading reviews...
            </p>
          ) : filteredReviews.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-gray-500)' }}>No reviews yet.</p>
          ) : (
            <div style={{ maxHeight: '20rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredReviews.map(r => (
                <div key={r.id} style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-gray-200)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flexShrink: 0 }}>
                      {r.userPhoto ? (
                        <img
                          src={r.userPhoto}
                          alt={r.userName || 'User'}
                          style={{ width: '2rem', height: '2rem', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '2rem',
                          height: '2rem',
                          background: '#e5e7eb',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <User style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 500, color: 'var(--color-gray-900)' }}>
                            {r.userName || 'Anonymous User'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
                            {new Date(r.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        {user?.uid === astrologerId && (
                          <button
                            onClick={() => handleDeleteReview(r.id)}
                            className="btn btn-ghost"
                            style={{ color: '#dc2626' }}
                          >
                            <Trash2 style={{ width: '1rem', height: '1rem' }} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.125rem', marginBottom: '0.5rem' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            style={{
                              width: '1rem',
                              height: '1rem',
                              fill: i < r.rating ? '#facc15' : 'none',
                              color: i < r.rating ? '#facc15' : '#d1d5db',
                            }}
                          />
                        ))}
                      </div>

                      <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>
                        {r.comment}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}