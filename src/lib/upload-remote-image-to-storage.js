/**
 * Upload a remote image URL (e.g. from OpenAI DALL-E) to Firebase Storage
 * so it persists like manual blog images. OpenAI URLs expire; Storage URLs do not.
 */

import { getStorageBucket } from '@/lib/firebase-admin'
import sharp from 'sharp'

const MAX_DOWNLOAD_SIZE = 10 * 1024 * 1024 // 10MB
const DOWNLOAD_TIMEOUT_MS = 30000

/**
 * Download image from URL to buffer.
 * @param {string} url
 * @returns {Promise<Buffer|null>}
 */
async function downloadImage(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'image/*' },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const contentLength = res.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_DOWNLOAD_SIZE) return null
    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_DOWNLOAD_SIZE) return null
    return Buffer.from(arrayBuffer)
  } catch (e) {
    clearTimeout(timeout)
    console.error('[upload-remote-image] Download failed:', e?.message)
    return null
  }
}

/**
 * Upload a remote image to Firebase Storage under blog/ai/ (same pattern as manual blog images).
 * Returns the public Storage URL to store in Firestore featuredImage, or null on failure.
 * @param {string} remoteImageUrl - e.g. OpenAI temporary image URL
 * @param {Object} options - { prefix: 'blog/ai' }
 * @returns {Promise<string|null>} Public URL (https://storage.googleapis.com/...) or null
 */
export async function uploadRemoteImageToStorage(remoteImageUrl, options = {}) {
  if (!remoteImageUrl || typeof remoteImageUrl !== 'string') return null

  const bucket = getStorageBucket()
  if (!bucket) {
    console.warn('[upload-remote-image] No storage bucket configured')
    return null
  }

  const prefix = options.prefix || 'blog/ai'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 12)
  const fileName = `${prefix}/${timestamp}-${random}.webp`

  const buffer = await downloadImage(remoteImageUrl)
  if (!buffer || buffer.length === 0) return null

  let uploadBuffer = buffer
  let contentType = 'image/webp'

  try {
    const meta = await sharp(buffer).metadata()
    const format = meta.format
    // Prefer WebP for size; skip conversion for gif/svg to avoid breaking animation
    if (format !== 'gif' && format !== 'svg') {
      uploadBuffer = await sharp(buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()
    } else {
      const ext = format === 'gif' ? 'gif' : 'png'
      contentType = format === 'gif' ? 'image/gif' : 'image/png'
      const altFileName = `${prefix}/${timestamp}-${random}.${ext}`
      const fileRef = bucket.file(altFileName)
      await fileRef.save(buffer, {
        metadata: {
          contentType,
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: { source: 'ai-generated', uploadedAt: new Date().toISOString() },
        },
        public: true,
      })
      return `https://storage.googleapis.com/${bucket.name}/${altFileName}`
    }
  } catch (err) {
    console.error('[upload-remote-image] Sharp error, uploading original:', err?.message)
    // Fallback: upload as-is with detected or default type
    try {
      const fallbackName = `${prefix}/${timestamp}-${random}.png`
      const fileRef = bucket.file(fallbackName)
      await fileRef.save(buffer, {
        metadata: {
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: { source: 'ai-generated', uploadedAt: new Date().toISOString() },
        },
        public: true,
      })
      return `https://storage.googleapis.com/${bucket.name}/${fallbackName}`
    } catch (e2) {
      console.error('[upload-remote-image] Fallback upload failed:', e2?.message)
      return null
    }
  }

  try {
    const fileRef = bucket.file(fileName)
    await fileRef.save(uploadBuffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: { source: 'ai-generated', uploadedAt: new Date().toISOString() },
      },
      public: true,
    })
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`
  } catch (e) {
    console.error('[upload-remote-image] Upload failed:', e?.message)
    return null
  }
}
