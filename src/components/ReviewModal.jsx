'use client';

import { useState, useEffect } from 'react';
import { Star, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Modal from '@/components/Modal';
import { useAuth } from '@/contexts/AuthContext';

export default function ReviewModal({ open, onClose, astrologerId, astrologerName, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [filter, setFilter] = useState('All');
  const { user } = useAuth();

  const handleStarClick = (starIndex) => {
    setRating(starIndex + 1);
  };

  const fetchReviews = async () => {
    if (!astrologerId) return;
    setLoadingReviews(true);
    try {
      const response = await fetch(`/api/reviews?astrologerId=${astrologerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReviews(data.reviews);
        }
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (open && astrologerId) {
      fetchReviews();
    }
  }, [open, astrologerId]);

  const filteredReviews = reviews.filter(review => {
    if (filter === 'All') return true;
    return review.rating === parseInt(filter);
  });

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating.');
      return;
    }
    setSubmitting(true);
    try {
      const userId = user?.uid || localStorage.getItem('tgs:userId');
      if (!userId) {
        alert('User not authenticated. Please log in again.');
        return;
      }
      await onSubmit({ astrologerId, userId, rating, comment });
      setRating(0);
      setComment('');
      fetchReviews(); // Refresh reviews after submission
    } catch (error) {
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }
    try {
      const response = await fetch(`/api/reviews?astrologerId=${astrologerId}&reviewId=${reviewId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete review');
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      fetchReviews(); // Refresh reviews after deletion
    } catch (error) {
      alert('Failed to delete review. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Reviews for ${astrologerName}`}>
      <div className="space-y-6">
        {/* Submission Form */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Submit Your Review</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    className={`w-8 h-8 cursor-pointer ${
                      index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                    onClick={() => handleStarClick(index)}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">{rating} out of 5 stars</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
              <div className="flex items-center space-x-3">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={2}
                  placeholder="Share your experience..."
                />
                <Button onClick={handleSubmit} disabled={submitting} className="px-6 py-3 h-auto whitespace-nowrap">
                  {submitting ? 'Submitting...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Panel */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Reviews</h3>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded-md"
            >
              <option value="All">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
          {loadingReviews ? (
            <p>Loading reviews...</p>
          ) : filteredReviews.length === 0 ? (
            <p>No reviews yet.</p>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {filteredReviews.map((review) => (
                <div key={review.id} className="border-b pb-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {review.userPhoto ? (
                        <img
                          src={review.userPhoto}
                          alt={review.userName || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {review.userName || 'Anonymous User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(review.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        {user?.uid === astrologerId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center mb-2">
                        {[...Array(5)].map((_, index) => (
                          <Star
                            key={index}
                            className={`w-4 h-4 ${
                              index < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-700">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}