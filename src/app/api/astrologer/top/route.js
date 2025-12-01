import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error?.message)
  }
}

const db = getFirestore()

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = parseInt(searchParams.get('limit') || '10', 10)
    const limit = Number.isNaN(limitParam) || limitParam <= 0 ? 10 : Math.min(50, limitParam)

    // Fetch astrologers without composite index requirements
    const onlineQ = db.collection('astrologers').where('status', '==', 'online').limit(limit * 2)
    const featuredQ = db.collection('astrologers').where('isFeatured', '==', true).limit(limit * 2)

    const [onlineSnap, featuredSnap] = await Promise.all([onlineQ.get(), featuredQ.get()])

    const mapDoc = (doc) => {
      const d = doc.data() || {}
      return {
        id: doc.id,
        name: d.name || d.displayName || 'Unknown',
        tags: Array.isArray(d.tags) ? d.tags : d.specialities || d.tags?.split?.(',') || [],
        rating: typeof d.rating === 'number' ? d.rating : parseFloat(d.rating) || null,
        online: d.status === 'online',
        isFeatured: Boolean(d.isFeatured),
      }
    }

    // Sort by rating in memory and limit results
    const online = onlineSnap.docs
      .map(mapDoc)
      .filter(doc => doc.rating !== null)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit)
    
    const featured = featuredSnap.docs
      .map(mapDoc)
      .filter(doc => doc.rating !== null)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit)

    return NextResponse.json({ success: true, online, featured })
  } catch (error) {
    console.error('Error fetching top astrologers:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
