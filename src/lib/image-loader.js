/**
 * Custom Image Loader for Next.js Image Component
 * This allows loading images from any URL by proxying through our API
 * 
 * Usage in Next.js Image component:
 * <Image
 *   src={imageUrl}
 *   loader={customImageLoader}
 *   ...
 * />
 */

export function customImageLoader({ src, width, quality }) {
  // If it's already a relative URL or from our domain, use it directly
  if (src.startsWith('/') || src.includes('rahunow.com') || src.includes('localhost')) {
    return src
  }

  // For external URLs, proxy through our API
  // This allows ANY image URL from ANY website to work
  const params = new URLSearchParams({
    url: src,
    w: width || 1200,
    q: quality || 75,
  })

  return `/api/image-proxy?${params.toString()}`
}

/**
 * Simple loader that returns the URL as-is
 * Use this if you set unoptimized: true in next.config.mjs
 */
export function simpleImageLoader({ src }) {
  return src
}
