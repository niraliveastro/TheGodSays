import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

// Mark this route as dynamic (not prerendered at build time)
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { astrologerId } = await request.json();

    if (!astrologerId) {
      return NextResponse.json({ success: false, message: 'Astrologer ID is required.' }, { status: 400 });
    }

    const astrologerRef = db.doc(`astrologers/${astrologerId}`);
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

    return NextResponse.json({ success: true, message: 'Reviews recalculated successfully.', rating: parseFloat(averageRating), reviews: totalReviews });
  } catch (error) {
    console.error('Error recalculating reviews:', error);
    return NextResponse.json({ success: false, message: 'Failed to recalculate reviews.' }, { status: 500 });
  }
}