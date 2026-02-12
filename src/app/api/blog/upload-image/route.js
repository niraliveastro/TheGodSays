import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import sharp from 'sharp'
import { requireAdminAuth } from '@/lib/admin-auth'

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
    // Verify admin authentication
    const authError = await requireAdminAuth(request)
    if (authError) {
      return authError
    }

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

    // Generate unique filename (without extension - we'll add it based on format)
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const baseFileName = `${type}/${timestamp}-${randomString}`

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const originalBuffer = Buffer.from(arrayBuffer)

    // Process image with Sharp to create optimized variants
    let sharpImage
    let metadata
    try {
      sharpImage = sharp(originalBuffer)
      metadata = await sharpImage.metadata()
      
      if (!metadata.format) {
        throw new Error('Unable to detect image format')
      }
    } catch (error) {
      console.error('Error processing image:', error)
      // Fallback: upload original file without optimization
      const fallbackExtension = file.name.split('.').pop() || 'jpg'
      const fallbackFileName = `${type}/${timestamp}-${randomString}.${fallbackExtension}`
      const fallbackFileRef = bucket.file(fallbackFileName)
      await fallbackFileRef.save(originalBuffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            optimized: 'false',
          },
        },
        public: true,
      })
      const fallbackUrl = `https://storage.googleapis.com/${bucket.name}/${fallbackFileName}`
      return NextResponse.json({
        success: true,
        url: fallbackUrl,
        fileName: fallbackFileName,
        optimized: false,
      })
    }
    
    // Determine output format - prefer WebP for better compression
    const shouldConvertToWebP = metadata.format !== 'gif' && metadata.format !== 'svg'
    const outputFormat = shouldConvertToWebP ? 'webp' : (metadata.format || 'jpeg')
    const outputMimeType = shouldConvertToWebP ? 'image/webp' : file.type

    // Image size configurations
    const variants = {
      desktop: { width: 1920, quality: 85, suffix: 'desktop' },
      mobile: { width: 768, quality: 80, suffix: 'mobile' },
      thumbnail: { width: 400, quality: 75, suffix: 'thumb' },
    }

    const uploadPromises = []
    const urls = {}

    // Upload optimized variants
    for (const [key, config] of Object.entries(variants)) {
      try {
        // Resize and optimize image
        let optimizedBuffer
        if (metadata.format === 'svg' || metadata.format === 'gif') {
          // For SVG/GIF, upload original (no optimization)
          if (key === 'desktop') {
            optimizedBuffer = originalBuffer
          } else {
            continue // Skip other variants for SVG/GIF
          }
        } else {
          // Resize maintaining aspect ratio
          const resizedImage = sharpImage.clone().resize(config.width, null, {
            withoutEnlargement: true, // Don't enlarge small images
            fit: 'inside',
          })

          // Apply format-specific optimizations
          if (outputFormat === 'webp') {
            optimizedBuffer = await resizedImage.webp({ quality: config.quality }).toBuffer()
          } else if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
            optimizedBuffer = await resizedImage.jpeg({ quality: config.quality, progressive: true }).toBuffer()
          } else if (outputFormat === 'png') {
            optimizedBuffer = await resizedImage.png({ quality: config.quality, compressionLevel: 9 }).toBuffer()
          } else {
            optimizedBuffer = await resizedImage.toBuffer()
          }
        }

        // Generate filename for this variant
        const extension = outputFormat === 'webp' ? 'webp' : (file.name.split('.').pop() || 'jpg')
        const variantFileName = `${baseFileName}-${config.suffix}.${extension}`

        // Upload to Firebase Storage
        const variantFileRef = bucket.file(variantFileName)
        uploadPromises.push(
          variantFileRef.save(optimizedBuffer, {
            metadata: {
              contentType: key === 'desktop' && (metadata.format === 'svg' || metadata.format === 'gif') 
                ? file.type 
                : outputMimeType,
              cacheControl: 'public, max-age=31536000, immutable', // Cache for 1 year
              metadata: {
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
                variant: key,
                optimized: 'true',
              },
            },
            public: true,
          }).then(() => {
            urls[key] = `https://storage.googleapis.com/${bucket.name}/${variantFileName}`
          })
        )
      } catch (error) {
        console.error(`Error processing ${key} variant:`, error)
        // Continue with other variants even if one fails
      }
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises)

    // If no variants were uploaded successfully, upload original as fallback
    if (Object.keys(urls).length === 0) {
      const fallbackExtension = file.name.split('.').pop() || 'jpg'
      const fallbackFileName = `${baseFileName}.${fallbackExtension}`
      const fallbackFileRef = bucket.file(fallbackFileName)
      await fallbackFileRef.save(originalBuffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
          },
        },
        public: true,
      })
      urls.desktop = `https://storage.googleapis.com/${bucket.name}/${fallbackFileName}`
      urls.mobile = urls.desktop
      urls.thumbnail = urls.desktop
    } else {
      // Ensure all required variants exist (use desktop as fallback)
      if (!urls.mobile) urls.mobile = urls.desktop
      if (!urls.thumbnail) urls.thumbnail = urls.desktop
    }

    // Return URLs - desktop URL is the primary one for backward compatibility
    return NextResponse.json({
      success: true,
      url: urls.desktop || urls.mobile, // Primary URL (backward compatible)
      fileName: baseFileName,
      urls: urls, // All variant URLs
      optimized: true,
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image', details: error.message },
      { status: 500 }
    )
  }
}