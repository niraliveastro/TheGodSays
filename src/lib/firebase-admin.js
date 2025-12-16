import admin from 'firebase-admin'

let adminApp = null
let dbInstance = null
let authInstance = null
let initializationAttempted = false

// Lazy initialization function - called when db/auth is accessed
function initializeFirebaseAdmin() {
  // If already initialized, return
  if (adminApp) {
    return adminApp
  }

  // If already attempted and failed, don't retry
  if (initializationAttempted && !adminApp) {
    return null
  }

  initializationAttempted = true

  try {
    // Check if already initialized by another instance
    if (admin.apps.length > 0) {
      adminApp = admin.app()
      dbInstance = adminApp.firestore()
      authInstance = adminApp.auth()
      return adminApp
    }

    // Get environment variables
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
    
    const hasServiceAccount = privateKey && clientEmail && projectId

    if (hasServiceAccount) {
      // Handle private key formatting - replace escaped newlines
      let formattedPrivateKey = privateKey.trim()
      
      // If it already has BEGIN/END markers, just fix newlines
      if (formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        // Key already has markers, just fix escaped newlines
        formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n')
      } else {
        // Key doesn't have markers, remove any and add them properly
        formattedPrivateKey = formattedPrivateKey.replace(/-----BEGIN PRIVATE KEY-----/g, '')
        formattedPrivateKey = formattedPrivateKey.replace(/-----END PRIVATE KEY-----/g, '')
        formattedPrivateKey = formattedPrivateKey.trim()
        // Fix escaped newlines
        formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n')
        // Add proper markers
        formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----`
      }
      
      const serviceAccount = {
        type: 'service_account',
        project_id: projectId,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || 'fbsvc',
        private_key: formattedPrivateKey,
        client_email: clientEmail.trim(),
        client_id: process.env.FIREBASE_CLIENT_ID || '462409339781',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail.trim())}`,
      }
      
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
      })
      
      dbInstance = adminApp.firestore()
      authInstance = adminApp.auth()
      
      console.log('[Firebase Admin] Initialized successfully')
      return adminApp
    } else {
      // Log what's missing for debugging
      const missing = []
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY')
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL')
      if (!projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID')
      
      console.error(`[Firebase Admin] Missing environment variables: ${missing.join(', ')}`)
      console.error('[Firebase Admin] Debug info:', {
        hasPrivateKey: !!privateKey,
        hasClientEmail: !!clientEmail,
        hasProjectId: !!projectId,
        projectId: projectId,
        privateKeyLength: privateKey?.length || 0,
        clientEmail: clientEmail || 'not set',
      })
      
      return null
    }
  } catch (error) {
    console.error('[Firebase Admin] Initialization error:', error.message)
    console.error('[Firebase Admin] Error stack:', error.stack)
    return null
  }
}

// Export functions that initialize on access (lazy initialization)
export function getFirestore() {
  if (!dbInstance) {
    initializeFirebaseAdmin()
  }
  return dbInstance
}

export function getAuthInstance() {
  if (!authInstance) {
    initializeFirebaseAdmin()
  }
  return authInstance
}

// For backward compatibility - export db and auth as getters
// These initialize lazily when accessed
export function getDb() {
  if (!dbInstance) {
    initializeFirebaseAdmin()
  }
  return dbInstance
}

export function getAuth() {
  if (!authInstance) {
    initializeFirebaseAdmin()
  }
  return authInstance
}

// Export db and auth for backward compatibility
// Use getFirestore() and getAuthInstance() instead for better clarity
export const db = null // Will be initialized lazily via getFirestore()
export const auth = null // Will be initialized lazily via getAuthInstance()
