import admin from 'firebase-admin'

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

let adminApp = null

// Initialize Admin SDK
if (!admin.apps.length) {
  try {
    // Check if we have the required service account credentials
    const hasServiceAccount = 
      process.env.FIREBASE_PRIVATE_KEY && 
      process.env.FIREBASE_CLIENT_EMAIL &&
      firebaseConfig.projectId

    if (hasServiceAccount) {
      const serviceAccount = {
        type: 'service_account',
        project_id: firebaseConfig.projectId,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || 'fbsvc',
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID || '462409339781',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
      }
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId,
      })
    } else if (firebaseConfig.projectId) {
      // Fallback: Initialize with project ID only (for build time when credentials might not be available)
      adminApp = admin.initializeApp({
        projectId: firebaseConfig.projectId,
      })
    } else {
      console.warn('Firebase Admin: Missing configuration. Some features may not work.')
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    // Only try fallback if we have a project ID
    if (firebaseConfig.projectId && !admin.apps.length) {
      try {
        adminApp = admin.initializeApp({
          projectId: firebaseConfig.projectId,
        })
      } catch (fallbackError) {
        console.error('Firebase Admin fallback initialization also failed:', fallbackError)
      }
    }
  }
}

// Export db and auth only if admin is initialized
export const db = adminApp ? admin.firestore() : null
export const auth = adminApp ? admin.auth() : null