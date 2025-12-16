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
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const projectId = firebaseConfig.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    
    const hasServiceAccount = privateKey && clientEmail && projectId

    if (hasServiceAccount) {
      // Handle private key formatting - replace escaped newlines
      let formattedPrivateKey = privateKey
      if (formattedPrivateKey.includes('\\n')) {
        formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n')
      }
      
      // Ensure private key starts and ends correctly
      if (!formattedPrivateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----`
      }
      
      const serviceAccount = {
        type: 'service_account',
        project_id: projectId,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || 'fbsvc',
        private_key: formattedPrivateKey,
        client_email: clientEmail,
        client_id: process.env.FIREBASE_CLIENT_ID || '462409339781',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
      }
      
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
      })
      
      console.log('Firebase Admin initialized successfully')
    } else {
      // Log what's missing for debugging
      const missing = []
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY')
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL')
      if (!projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID')
      
      console.warn(`Firebase Admin: Missing environment variables: ${missing.join(', ')}`)
      
      if (projectId) {
        // Fallback: Initialize with project ID only (for build time when credentials might not be available)
        adminApp = admin.initializeApp({
          projectId: projectId,
        })
        console.warn('Firebase Admin initialized with project ID only (limited functionality)')
      } else {
        console.warn('Firebase Admin: Missing configuration. Some features may not work.')
      }
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message)
    console.error('Error details:', {
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasProjectId: !!firebaseConfig.projectId,
      projectId: firebaseConfig.projectId,
    })
    
    // Only try fallback if we have a project ID
    const projectId = firebaseConfig.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (projectId && !admin.apps.length) {
      try {
        adminApp = admin.initializeApp({
          projectId: projectId,
        })
        console.warn('Firebase Admin fallback initialization succeeded (limited functionality)')
      } catch (fallbackError) {
        console.error('Firebase Admin fallback initialization also failed:', fallbackError.message)
      }
    }
  }
}

// Export db and auth only if admin is initialized
export const db = adminApp ? admin.firestore() : null
export const auth = adminApp ? admin.auth() : null