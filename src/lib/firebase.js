import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

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
if (typeof window !== 'undefined') {
  // Warn if required config is missing
  if (!firebaseConfig.apiKey) {
    // eslint-disable-next-line no-console
    console.warn('Missing NEXT_PUBLIC_FIREBASE_API_KEY. Firebase auth will not work until you set it.')
  }

  // Avoid re-initializing during HMR
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
}

// Export auth and db when running in the browser; export null on server
export const auth = typeof window !== 'undefined' && app ? getAuth(app) : null
export const db = typeof window !== 'undefined' && app ? getFirestore(app) : null
