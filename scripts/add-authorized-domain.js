/**
 * Script to add rahunow.com as an authorized domain for Google OAuth
 * 
 * This script uses Firebase Management API to add the authorized domain.
 * 
 * Prerequisites:
 * 1. Enable Firebase Management API in Google Cloud Console
 * 2. Create a service account with Firebase Admin permissions
 * 3. Set FIREBASE_PROJECT_ID environment variable
 * 
 * Usage:
 * node scripts/add-authorized-domain.js
 */

const admin = require('firebase-admin');
const https = require('https');

// Initialize Firebase Admin
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error('Error: FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID must be set');
  process.exit(1);
}

// Initialize Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: projectId,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (serviceAccount.privateKey && serviceAccount.clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
      });
    } else {
      console.warn('Warning: Firebase Admin credentials not found. Using default initialization.');
      admin.initializeApp({
        projectId: projectId,
      });
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    process.exit(1);
  }
}

async function addAuthorizedDomain() {
  const domain = 'rahunow.com';
  
  console.log(`\n⚠️  IMPORTANT: Authorized domains must be added manually in Firebase Console.`);
  console.log(`\nTo add "${domain}" as an authorized domain:\n`);
  console.log(`1. Go to Firebase Console: https://console.firebase.google.com/`);
  console.log(`2. Select your project: ${projectId}`);
  console.log(`3. Navigate to: Authentication > Settings > Authorized domains`);
  console.log(`4. Click "Add domain"`);
  console.log(`5. Enter: ${domain}`);
  console.log(`6. Click "Add"`);
  console.log(`\nAlso add in Google Cloud Console:\n`);
  console.log(`1. Go to: https://console.cloud.google.com/apis/credentials`);
  console.log(`2. Select your project: ${projectId}`);
  console.log(`3. Click on your OAuth 2.0 Client ID`);
  console.log(`4. Under "Authorized JavaScript origins", click "Add URI"`);
  console.log(`5. Add: https://${domain}`);
  console.log(`6. Under "Authorized redirect URIs", click "Add URI"`);
  console.log(`7. Add: https://${domain}/__/auth/handler`);
  console.log(`8. Click "Save"`);
  console.log(`\n✅ After adding, Google sign-in will work on ${domain}\n`);
}

// Run the script
addAuthorizedDomain().catch(console.error);

