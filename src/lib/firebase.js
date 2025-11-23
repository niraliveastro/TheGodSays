import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage' 

// Build-time / runtime config read from NEXT_PUBLIC_ env vars
// These are expected to be defined in .env.local for local development
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
}

let app = null
// Initialize Firebase for both client and server
if (typeof window !== 'undefined' || typeof process !== 'undefined') {
  // Check if required config is present
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Missing Firebase configuration. Please set NEXT_PUBLIC_FIREBASE_* environment variables.')
  } else {
    // Avoid re-initializing during HMR
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  }
}

// Export auth and db for both client and server
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null

