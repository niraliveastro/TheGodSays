import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Prevent static generation - this is a dynamic API route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Lazy Firebase initialization function
function getFirestoreDB() {
  // Initialize Firebase Admin if not already initialized
  if (!getApps().length) {
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase environment variables are not set');
      }

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        })
      });
    } catch (error) {
      console.error('Firebase Admin initialization failed:', error.message);
      throw error;
    }
  }

  return getFirestore();
}

/**
 * GET /api/users/name?userId=xxx
 * Fetch user name by userId (server-side, bypasses security rules)
 */
export async function GET(request) {
  try {
    const db = getFirestoreDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId is required' 
      }, { status: 400 });
    }

    console.log(`[API] Fetching name for userId: ${userId}`);

    // Try users collection first
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const name = userData.name || 
                    userData.displayName || 
                    userData.fullName || 
                    userData.firstName ||
                    userData.username;
        
        if (name) {
          console.log(`[API] Found name in users collection: ${name}`);
          return NextResponse.json({ 
            success: true, 
            name: name.trim(),
            userId: userId
          });
        }
        
        // Try to extract from email
        if (userData.email) {
          const emailName = userData.email.split('@')[0];
          const generatedName = emailName.charAt(0).toUpperCase() + emailName.slice(1).replace(/[._-]/g, ' ');
          console.log(`[API] Generated name from email: ${generatedName}`);
          return NextResponse.json({ 
            success: true, 
            name: generatedName,
            userId: userId
          });
        }
      }
    } catch (error) {
      console.error(`[API] Error checking users collection:`, error.message);
    }

    // User not found or no name
    const fallbackName = `User ${userId.substring(0, 8)}`;
    console.log(`[API] Using fallback name: ${fallbackName}`);
    
    return NextResponse.json({ 
      success: true, 
      name: fallbackName,
      userId: userId
    });
  } catch (error) {
    console.error('[API] Error fetching user name:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/users/name
 * Batch fetch multiple user names
 * Body: { userIds: ['id1', 'id2', ...] }
 */
export async function POST(request) {
  try {
    const db = getFirestoreDB();
    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'userIds array is required' 
      }, { status: 400 });
    }

    console.log(`[API] Batch fetching names for ${userIds.length} users`);

    const names = {};
    
    // Fetch all users in parallel
    const promises = userIds.map(async (userId) => {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          const name = userData.name || 
                      userData.displayName || 
                      userData.fullName || 
                      userData.firstName ||
                      userData.username;
          
          if (name) {
            return { userId, name: name.trim() };
          }
          
          // Try to extract from email
          if (userData.email) {
            const emailName = userData.email.split('@')[0];
            const generatedName = emailName.charAt(0).toUpperCase() + emailName.slice(1).replace(/[._-]/g, ' ');
            return { userId, name: generatedName };
          }
        }
        
        // Fallback
        return { userId, name: `User ${userId.substring(0, 8)}` };
      } catch (error) {
        console.error(`[API] Error fetching name for ${userId}:`, error.message);
        return { userId, name: `User ${userId.substring(0, 8)}` };
      }
    });

    const results = await Promise.all(promises);
    results.forEach(({ userId, name }) => {
      names[userId] = name;
    });

    console.log(`[API] Successfully fetched ${Object.keys(names).length} names`);
    
    return NextResponse.json({ 
      success: true, 
      names 
    });
  } catch (error) {
    console.error('[API] Error batch fetching user names:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

