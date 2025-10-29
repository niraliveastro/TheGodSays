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
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

const db = getFirestore()

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const astrologerId = searchParams.get('astrologerId')

    if (!userId && !astrologerId) {
      return NextResponse.json({ success: false, message: 'userId or astrologerId is required' }, { status: 400 })
    }

    let query = db.collection('calls')
    if (userId) {
      query = query.where('userId', '==', userId)
    }
    if (astrologerId) {
      query = query.where('astrologerId', '==', astrologerId)
    }

    const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get()
    const history = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ success: true, history })
  } catch (error) {
    console.error('Error fetching call history:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
