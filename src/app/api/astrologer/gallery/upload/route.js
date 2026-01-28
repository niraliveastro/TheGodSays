import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import sharp from 'sharp';

// Configure route to handle file uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout for large file uploads

// Initialize Firebase Admin Storage
function getStorage() {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin.storage();
  }

  // Initialize if not already initialized
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error('Firebase Admin not initialized. Missing environment variables.');
  }

  // Handle private key formatting
  let formattedPrivateKey = privateKey.trim();
  if (formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
  } else {
    formattedPrivateKey = formattedPrivateKey.replace(/-----BEGIN PRIVATE KEY-----/g, '');
    formattedPrivateKey = formattedPrivateKey.replace(/-----END PRIVATE KEY-----/g, '');
    formattedPrivateKey = formattedPrivateKey.trim();
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
    formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----`;
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
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  return admin.storage();
}

export async function POST(request) {
  try {
    console.log('[Gallery Upload] Starting upload...');
    console.log('[Gallery Upload] Content-Type:', request.headers.get('content-type'));
    
    let formData;
    try {
      formData = await request.formData();
      console.log('[Gallery Upload] FormData parsed successfully');
    } catch (error) {
      console.error('[Gallery Upload] FormData parsing error:', error);
      return NextResponse.json(
        { error: 'Invalid form data. Please ensure you are uploading a file.' },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    const astrologerId = formData.get('astrologerId');
    
    console.log('[Gallery Upload] File info:', {
      hasFile: !!file,
      astrologerId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
    });

    if (!file || !astrologerId) {
      return NextResponse.json(
        { error: 'File and astrologer ID are required' },
        { status: 400 }
      );
    }

    // Check if file is actually a File object
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid file object' },
        { status: 400 }
      );
    }

    // Get file type (must be before size validation)
    const fileType = file.type;
    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'File must be an image or video' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB for videos, 10MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be less than ${isVideo ? '50MB' : '10MB'}` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    let bytes;
    try {
      bytes = await file.arrayBuffer();
    } catch (error) {
      console.error('Error reading file:', error);
      return NextResponse.json(
        { error: 'Failed to read file data' },
        { status: 400 }
      );
    }
    let buffer = Buffer.from(bytes);

    // Optimize images with sharp (skip for videos)
    let optimizedBuffer = buffer;
    let contentType = fileType;
    let fileExtension = file.name.split('.').pop() || 'jpg';

    if (isImage) {
      try {
        // Optimize image: resize if too large, compress, convert to webp
        const image = sharp(buffer);
        const metadata = await image.metadata();

        // Resize if width > 1920px
        if (metadata.width > 1920) {
          image.resize(1920, null, { withoutEnlargement: true });
        }

        optimizedBuffer = await image
          .webp({ quality: 85 })
          .toBuffer();

        contentType = 'image/webp';
        fileExtension = 'webp';
      } catch (error) {
        console.error('Error optimizing image:', error);
        // If optimization fails, use original buffer
        optimizedBuffer = buffer;
        contentType = fileType;
      }
    } else if (isVideo) {
      // For videos, use original buffer and content type
      optimizedBuffer = buffer;
      contentType = fileType;
      // Ensure we have a valid video extension
      if (!fileExtension || !['mp4', 'webm', 'mov', 'avi'].includes(fileExtension.toLowerCase())) {
        fileExtension = 'mp4'; // Default to mp4
      }
    }

    // Get Firebase Storage
    const storage = getStorage();
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    
    if (!storageBucket) {
      return NextResponse.json(
        { error: 'Storage bucket not configured' },
        { status: 500 }
      );
    }

    let bucket;
    try {
      bucket = storage.bucket(storageBucket);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to access storage bucket' },
        { status: 500 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `astrologer-gallery/${astrologerId}/${timestamp}-${randomString}.${fileExtension}`;

    // Upload to Firebase Storage
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(optimizedBuffer, {
      metadata: {
        contentType: contentType,
      },
    });

    // Make the file public
    try {
      await fileUpload.makePublic();
      console.log('[Gallery Upload] File made public');
    } catch (error) {
      console.error('[Gallery Upload] Error making file public:', error);
      // Continue anyway, file might still be accessible
    }

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    console.log('[Gallery Upload] Public URL:', publicUrl);

    // Generate thumbnail for videos (optional - for now just use the video URL)
    let thumbnailUrl = publicUrl;
    if (isVideo) {
      // In a production app, you might want to generate a video thumbnail
      // For now, we'll use a placeholder or the video itself
      thumbnailUrl = publicUrl;
    }

    console.log('[Gallery Upload] Upload successful:', {
      mediaType: isImage ? 'image' : 'video',
      url: publicUrl,
    });

    return NextResponse.json(
      {
        mediaUrl: publicUrl,
        thumbnailUrl: thumbnailUrl,
        mediaType: isImage ? 'image' : 'video',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Gallery Upload] Error uploading file:', error);
    console.error('[Gallery Upload] Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
