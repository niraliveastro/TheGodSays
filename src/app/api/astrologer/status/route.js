import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
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

const db = getFirestore()

// Helper function to get astrologer status from Firestore
async function getAstrologerStatus(astrologerId) {
  try {
    const docRef = db.collection('astrologerStatus').doc(astrologerId)
    const docSnap = await docRef.get()

    if (docSnap.exists) {
      return docSnap.data()
    }

    // Return default status if not found
    return {
      status: 'offline',
      lastSeen: new Date().toISOString(),
      pendingCalls: []
    }
  } catch (error) {
    console.error('Error fetching astrologer status from Firestore:', error)
    return {
      status: 'offline',
      lastSeen: new Date().toISOString(),
      pendingCalls: []
    }
  }
}

// Helper function to update astrologer status in Firestore
async function updateAstrologerStatus(astrologerId, statusData) {
  try {
    const docRef = db.collection('astrologerStatus').doc(astrologerId)
    await docRef.set({
      ...statusData,
      lastSeen: new Date().toISOString()
    }, { merge: true })
    return true
  } catch (error) {
    console.error('Error updating astrologer status in Firestore:', error)
    return false
  }
}

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

    let newStatus
    switch (action) {
      case 'set-online':
        newStatus = 'online'
        break
      case 'set-offline':
        newStatus = 'offline'
        break
      case 'set-busy':
        newStatus = 'busy'
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update status in Firestore
    const statusData = {
      status: newStatus,
      lastSeen: new Date().toISOString(),
      pendingCalls: []
    }

    const updateSuccess = await updateAstrologerStatus(astrologerId, statusData)
    if (!updateSuccess) {
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Broadcast status update to all connected clients
    broadcastGlobal({ type: 'astrologer-status-updated', astrologerId, status: newStatus })

    return NextResponse.json({ success: true, status: newStatus })
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
      // Get status from Firestore
      const status = await getAstrologerStatus(astrologerId)
      return NextResponse.json({ success: true, ...status })
    }

    // For getting all statuses, we'll need to query Firestore
    // This is less efficient but needed for admin purposes
    try {
      const snapshot = await db.collection('astrologerStatus').get()
      const allStatuses = []

      snapshot.forEach(doc => {
        allStatuses.push({
          astrologerId: doc.id,
          ...doc.data()
        })
      })

      return NextResponse.json({ success: true, astrologers: allStatuses })
    } catch (firestoreError) {
      console.error('Error fetching all astrologer statuses:', firestoreError)
      return NextResponse.json({ success: true, astrologers: [] })
    }
  } catch (error) {
    console.error('Error fetching astrologer status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






















































// import { NextResponse } from 'next/server'
// import admin from 'firebase-admin'
// import { initializeApp, getApps, cert } from 'firebase-admin/app'
// import { broadcastGlobal } from '../../events/route'

// // Initialize Firebase Admin if not already initialized
// if (!getApps().length) {
//   try {
//     initializeApp({
//       credential: cert({
//         projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//         clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//         privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//       })
//     })
//   } catch (error) {
//     console.warn('Firebase Admin initialization failed:', error.message)
//   }
// }

// // In-memory storage for astrologer status - in production, use a database
// const astrologerStatus = new Map()

// export async function POST(request) {
//   try {
//     const { astrologerId, status, action } = await request.json()

//     if (!astrologerId) {
//       return NextResponse.json({ error: 'Astrologer ID is required' }, { status: 400 })
//     }

//     // Verify Firebase Auth token (optional for now, can be enforced later)
//     const authHeader = request.headers.get('authorization')
//     if (authHeader?.startsWith('Bearer ')) {
//       try {
//         const token = authHeader.substring(7)
//         const decodedToken = await admin.auth().verifyIdToken(token)
//         if (decodedToken.uid !== astrologerId) {
//           return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
//         }
//       } catch (authError) {
//         console.warn('Auth verification failed:', authError.message)
//         // Continue without auth for now
//       }
//     }

//     switch (action) {
//       case 'set-online':
//         astrologerStatus.set(astrologerId, {
//           status: 'online',
//           lastSeen: new Date().toISOString(),
//           pendingCalls: []
//         })
//         broadcastGlobal({ type: 'astrologer-status-updated', astrologerId, status: 'online' })
//         return NextResponse.json({ success: true, status: 'online' })

//       case 'set-offline':
//         astrologerStatus.set(astrologerId, {
//           status: 'offline',
//           lastSeen: new Date().toISOString(),
//           pendingCalls: []
//         })
//         broadcastGlobal({ type: 'astrologer-status-updated', astrologerId, status: 'offline' })
//         return NextResponse.json({ success: true, status: 'offline' })

//       case 'set-busy':
//         const currentStatus = astrologerStatus.get(astrologerId) || { status: 'offline' }
//         astrologerStatus.set(astrologerId, {
//           ...currentStatus,
//           status: 'busy',
//           lastSeen: new Date().toISOString()
//         })
//         broadcastGlobal({ type: 'astrologer-status-updated', astrologerId, status: 'busy' })
//         return NextResponse.json({ success: true, status: 'busy' })

//       default:
//         return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
//     }
//   } catch (error) {
//     console.error('Error updating astrologer status:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

// export async function GET(request) {
//   try {
//     const { searchParams } = new URL(request.url)
//     const astrologerId = searchParams.get('astrologerId')

//     if (astrologerId) {
//       // Initialize default status if not exists
//       if (!astrologerStatus.has(astrologerId)) {
//         astrologerStatus.set(astrologerId, {
//           status: 'online', // Default to online for testing
//           lastSeen: new Date().toISOString(),
//           pendingCalls: []
//         })
//       }

//       const status = astrologerStatus.get(astrologerId)
//       return NextResponse.json({ success: true, ...status })
//     }

//     // Return all astrologer statuses
//     const allStatuses = Array.from(astrologerStatus.entries()).map(([id, status]) => ({
//       astrologerId: id,
//       ...status
//     }))

//     return NextResponse.json({ success: true, astrologers: allStatuses })
//   } catch (error) {
//     console.error('Error fetching astrologer status:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }
