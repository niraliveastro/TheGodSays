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
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    // Fallback initialization for development
    adminApp = admin.initializeApp({
      projectId: firebaseConfig.projectId,
    })
  }
}

export const db = admin.firestore()
export const auth = admin.auth()