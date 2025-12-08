import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Mark this route as dynamic to prevent prerendering during build
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

export async function GET(request) {
  // Initialize db lazily to avoid build-time errors
  const db = getFirestore()
  try {
    const { searchParams } = new URL(request.url)
    const astrologerId = searchParams.get('astrologerId')

    // Validate astrologerId format
    if (astrologerId && (typeof astrologerId !== 'string' || astrologerId.length > 100)) {
      return NextResponse.json({ error: 'Invalid astrologer ID' }, { status: 400 })
    }

    if (astrologerId) {
      const astrologerRef = db.collection('astrologers').doc(astrologerId)
      const doc = await astrologerRef.get()
      if (!doc.exists) {
        return NextResponse.json({ success: false, error: 'Astrologer not found' }, { status: 404 })
      }
      const data = doc.data()
      return NextResponse.json({ success: true, status: data.status || 'offline' })
    }

    // Return all astrologer statuses (limit to prevent abuse)
    const astrologersRef = db.collection('astrologers').limit(50)
    const snapshot = await astrologersRef.get()
    const allStatuses = snapshot.docs.map(doc => ({
      astrologerId: doc.id,
      status: doc.data().status || 'offline'
    }))

    return NextResponse.json({ success: true, astrologers: allStatuses })
  } catch (error) {
    console.error('Error fetching astrologer status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
