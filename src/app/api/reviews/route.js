import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const astrologerId = searchParams.get('astrologerId');

    if (!astrologerId) {
      return NextResponse.json({ success: false, message: 'Astrologer ID is required.' }, { status: 400 });
    }

    const astrologerRef = db.doc(`astrologers/${astrologerId}`);
    const reviewsRef = astrologerRef.collection('reviews');
    const reviewsSnapshot = await reviewsRef.get();

    const reviews = await Promise.all(reviewsSnapshot.docs.map(async (reviewDoc) => {
      const data = reviewDoc.data();
      let userName = 'Anonymous User';
      let userPhoto = null;

      // Fetch user name and photo from users, user, or astrologers collection
      try {
        let userDoc;
        if (data.userId) {
          // Try users collection first
          userDoc = await db.doc(`users/${data.userId}`).get();
          if (userDoc.exists) {
            userName = userDoc.data().name || userDoc.data().displayName || 'Anonymous User';
            userPhoto = userDoc.data().photoURL || null;
          } else {
            // Try user collection
            userDoc = await db.doc(`user/${data.userId}`).get();
            if (userDoc.exists) {
              userName = userDoc.data().name || userDoc.data().displayName || 'Anonymous User';
              userPhoto = userDoc.data().photoURL || null;
            } else {
              // Try astrologers collection
              userDoc = await db.doc(`astrologers/${data.userId}`).get();
              if (userDoc.exists) {
                userName = userDoc.data().name || 'Anonymous User';
                userPhoto = userDoc.data().photoURL || null;
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }

      return {
        id: reviewDoc.id,
        ...data,
        userName,
        userPhoto,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
      };
    }));

    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch reviews.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { astrologerId, userId, rating, comment } = await request.json();

    if (!astrologerId || !userId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, message: 'Invalid data provided.' }, { status: 400 });
    }

    // Get the astrologer document reference
    const astrologerRef = db.doc(`astrologers/${astrologerId}`);

    // Add the review to the astrologer's reviews subcollection
    const reviewsRef = astrologerRef.collection('reviews');
    await reviewsRef.add({
      userId,
      rating: parseInt(rating),
      comment,
      timestamp: new Date(),
    });

    // Fetch all reviews for the astrologer to calculate new average
    const reviewsSnapshot = await reviewsRef.get();
    const reviews = reviewsSnapshot.docs.map(reviewDoc => reviewDoc.data());

    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

    // Update the astrologer's rating and reviews count
    await astrologerRef.update({
      rating: parseFloat(averageRating),
      reviews: totalReviews,
    });

    return NextResponse.json({ success: true, message: 'Review submitted successfully.' });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ success: false, message: 'Failed to submit review.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const astrologerId = searchParams.get('astrologerId');
    const reviewId = searchParams.get('reviewId');

    if (!astrologerId || !reviewId) {
      return NextResponse.json({ success: false, message: 'Astrologer ID and Review ID are required.' }, { status: 400 });
    }

    // Get the astrologer document reference
    const astrologerRef = db.doc(`astrologers/${astrologerId}`);
    const reviewRef = astrologerRef.collection('reviews').doc(reviewId);

    // Check if review exists
    const reviewDoc = await reviewRef.get();
    if (!reviewDoc.exists) {
      return NextResponse.json({ success: false, message: 'Review not found.' }, { status: 404 });
    }

    // Delete the review
    await reviewRef.delete();

    // Fetch all remaining reviews for the astrologer to calculate new average
    const reviewsRef = astrologerRef.collection('reviews');
    const reviewsSnapshot = await reviewsRef.get();
    const reviews = reviewsSnapshot.docs.map(reviewDoc => reviewDoc.data());

    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

    // Update the astrologer's rating and reviews count
    await astrologerRef.update({
      rating: parseFloat(averageRating),
      reviews: totalReviews,
    });

    return NextResponse.json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete review.' }, { status: 500 });
  }
}