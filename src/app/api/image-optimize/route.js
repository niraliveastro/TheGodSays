/**
 * Image Optimization API Route
 * Serves optimized images based on device/viewport size
 * Usage: /api/image-optimize?url=IMAGE_URL&w=WIDTH&q=QUALITY
 */

import { NextResponse } from 'next/server'
import sharp from 'sharp'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    const requestedWidth = parseInt(searchParams.get('w') || '1920')
    const requestedQuality = parseInt(searchParams.get('q') || '85')

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    // Validate URL
    let url
    try {
      url = new URL(imageUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 400 }
      )
    }

    // Fetch the image with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    let imageResponse
    try {
      imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImageOptimizer/1.0)',
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Image fetch timeout' },
          { status: 408 }
        )
      }
      throw error
    }

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: imageResponse.status }
      )
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    
    // Validate it's actually an image
    let image
    let metadata
    try {
      image = sharp(imageBuffer)
      metadata = await image.metadata()
      
      if (!metadata.format) {
        return NextResponse.json(
          { error: 'Invalid image format' },
          { status: 400 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to process image', details: error.message },
        { status: 400 }
      )
    }

    // Don't process SVG or GIF (animated)
    if (metadata.format === 'svg' || (metadata.format === 'gif' && metadata.pages > 1)) {
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': imageResponse.headers.get('content-type') || 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // Determine optimal width (don't upscale)
    const optimalWidth = Math.min(requestedWidth, metadata.width || requestedWidth)

    // Resize image
    let processedImage = image.clone().resize(optimalWidth, null, {
      withoutEnlargement: true,
      fit: 'inside',
    })

    // Determine output format (prefer WebP for better compression)
    const acceptHeader = request.headers.get('accept') || ''
    const supportsWebP = acceptHeader.includes('image/webp') && metadata.format !== 'gif'
    const outputFormat = supportsWebP ? 'webp' : (metadata.format || 'jpeg')

    // Process image based on format
    let optimizedBuffer
    const quality = Math.max(60, Math.min(95, requestedQuality)) // Clamp quality between 60-95

    if (outputFormat === 'webp') {
      optimizedBuffer = await processedImage.webp({ quality }).toBuffer()
    } else if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
      optimizedBuffer = await processedImage.jpeg({ quality, progressive: true }).toBuffer()
    } else if (outputFormat === 'png') {
      optimizedBuffer = await processedImage.png({ quality, compressionLevel: 9 }).toBuffer()
    } else {
      optimizedBuffer = await processedImage.toBuffer()
    }

    // Determine content type
    const contentType = outputFormat === 'webp' 
      ? 'image/webp' 
      : (metadata.format === 'png' ? 'image/png' : 'image/jpeg')

    return new NextResponse(optimizedBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Image-Optimized': 'true',
        'X-Original-Width': metadata.width?.toString() || 'unknown',
        'X-Optimized-Width': optimalWidth.toString(),
      },
    })
  } catch (error) {
    console.error('Error optimizing image:', error)
    return NextResponse.json(
      { error: 'Failed to optimize image', details: error.message },
      { status: 500 }
    )
  }
}

