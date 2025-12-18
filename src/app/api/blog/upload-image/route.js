import { NextResponse } from 'next/server'
import admin from 'firebase-admin'

// Initialize Firebase Admin Storage
function getStorage() {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin.storage()
  }

  // Initialize if not already initialized
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error('Firebase Admin not initialized. Missing environment variables.')
  }

  // Handle private key formatting
  let formattedPrivateKey = privateKey.trim()
  if (formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n')
  } else {
    formattedPrivateKey = formattedPrivateKey.replace(/-----BEGIN PRIVATE KEY-----/g, '')
    formattedPrivateKey = formattedPrivateKey.replace(/-----END PRIVATE KEY-----/g, '')
    formattedPrivateKey = formattedPrivateKey.trim()
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n')
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

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })

  return admin.storage()
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const type = formData.get('type') || 'blog' // 'blog' for blog images

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Get Firebase Storage
    const storage = getStorage()
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
    
    if (!storageBucket) {
      return NextResponse.json(
        { error: 'Storage bucket not configured. Please set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable.' },
        { status: 500 }
      )
    }
    
    // Try the provided bucket name first, fallback to project-based bucket names
    let bucket
    try {
      bucket = storage.bucket(storageBucket)
      // Test if bucket exists by trying to get its metadata
      await bucket.getMetadata().catch(() => {
        throw new Error('Bucket does not exist or is not accessible')
      })
    } catch (error) {
      // If the bucket doesn't exist, try alternative formats
      const alternativeBuckets = [
        `${projectId}.appspot.com`,
        `${projectId}.firebasestorage.app`,
        storageBucket.replace('.firebasestorage.app', '.appspot.com'),
        storageBucket.replace('.appspot.com', '.firebasestorage.app'),
      ]
      
      let found = false
      for (const altBucket of alternativeBuckets) {
        try {
          const testBucket = storage.bucket(altBucket)
          await testBucket.getMetadata()
          bucket = testBucket
          found = true
          console.log(`[Image Upload] Using alternative bucket: ${altBucket}`)
          break
        } catch {
          // Try next alternative
        }
      }
      
      if (!found) {
        return NextResponse.json(
          { 
            error: 'Firebase Storage is not enabled for this project.',
            details: `Storage bucket does not exist. Tried: ${storageBucket} and alternatives: ${alternativeBuckets.join(', ')}`,
            suggestion: 'To enable image uploads: 1) Upgrade to Blaze plan in Firebase Console, 2) Enable Storage (Storage → Get Started), 3) Restart your dev server. Until then, you can use the "Featured Image URL" field to paste image URLs from external sources (Unsplash, Imgur, etc.).'
          },
          { status: 404 }
        )
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${type}/${timestamp}-${randomString}.${fileExtension}`

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Firebase Storage
    const fileRef = bucket.file(fileName)
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      },
      public: true, // Make file publicly accessible
    })

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`

    // Alternative: Get signed URL (if public access is not enabled)
    // const [url] = await fileRef.getSignedUrl({
    //   action: 'read',
    //   expires: '03-09-2491', // Far future date
    // })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image', details: error.message },
      { status: 500 }
    )
  }
}
