import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { broadcastGlobal } from '../../events/route'

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

// In-memory storage for astrologer status - in production, use a database
const astrologerStatus = new Map()

export async function POST(request) {
  try {
    const { astrologerId, status, action } = await request.json()

    if (!astrologerId) {
      return NextResponse.json({ error: 'Astrologer ID is required' }, { status: 400 })
    }

    // Verify Firebase Auth token (optional for now, can be enforced later)
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decodedToken = await admin.auth().verifyIdToken(token)
        if (decodedToken.uid !== astrologerId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
      } catch (authError) {
        console.warn('Auth verification failed:', authError.message)
        // Continue without auth for now
      }
    }

    switch (action) {
      case 'set-online':
        astrologerStatus.set(astrologerId, {
          status: 'online',
          lastSeen: new Date().toISOString(),
          pendingCalls: []
        })
        broadcastGlobal({ type: 'astrologer-status-updated', astrologerId, status: 'online' })
        return NextResponse.json({ success: true, status: 'online' })

      case 'set-offline':
        astrologerStatus.set(astrologerId, {
          status: 'offline',
          lastSeen: new Date().toISOString(),
          pendingCalls: []
        })
        broadcastGlobal({ type: 'astrologer-status-updated', astrologerId, status: 'offline' })
        return NextResponse.json({ success: true, status: 'offline' })

      case 'set-busy':
        const currentStatus = astrologerStatus.get(astrologerId) || { status: 'offline' }
        astrologerStatus.set(astrologerId, {
          ...currentStatus,
          status: 'busy',
          lastSeen: new Date().toISOString()
        })
        broadcastGlobal({ type: 'astrologer-status-updated', astrologerId, status: 'busy' })
        return NextResponse.json({ success: true, status: 'busy' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating astrologer status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const astrologerId = searchParams.get('astrologerId')

    if (astrologerId) {
      // Initialize default status if not exists
      if (!astrologerStatus.has(astrologerId)) {
        astrologerStatus.set(astrologerId, {
          status: 'online', // Default to online for testing
          lastSeen: new Date().toISOString(),
          pendingCalls: []
        })
      }

      const status = astrologerStatus.get(astrologerId)
      return NextResponse.json({ success: true, ...status })
    }

    // Return all astrologer statuses
    const allStatuses = Array.from(astrologerStatus.entries()).map(([id, status]) => ({
      astrologerId: id,
      ...status
    }))

    return NextResponse.json({ success: true, astrologers: allStatuses })
  } catch (error) {
    console.error('Error fetching astrologer status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}