import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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
      }),
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

/**
 * GET /api/admin/astrologers
 * Get all astrologers for admin pricing management
 */
export async function GET(request) {
  try {
    const db = getFirestore()
    
    const astrologersSnapshot = await db.collection('astrologers').get()
    
    const astrologers = []
    astrologersSnapshot.forEach((doc) => {
      const data = doc.data()
      astrologers.push({
        id: doc.id,
        name: data.name || data.displayName || 'Unknown',
        specialization: data.specialization || '',
        status: data.status || 'offline',
      })
    })
    
    return NextResponse.json({ 
      success: true, 
      astrologers 
    })
  } catch (error) {
    console.error('Error fetching astrologers:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

