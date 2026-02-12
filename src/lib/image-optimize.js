/**
 * Image Optimization Utilities
 * Functions to transform and optimize images in blog content
 */

/**
 * Get optimized image URL based on device/viewport size
 * @param {string} imageUrl - Original image URL
 * @param {string} size - Size variant: 'desktop', 'mobile', or 'thumbnail'
 * @returns {string} - Optimized image URL
 */
export function getOptimizedImageUrl(imageUrl, size = 'desktop') {
  if (!imageUrl) return imageUrl

  // If it's already a Firebase Storage URL, check for variant suffix
  if (imageUrl.includes('storage.googleapis.com') || imageUrl.includes('firebasestorage.googleapis.com')) {
    const variantSuffixes = {
      desktop: '-desktop',
      mobile: '-mobile',
      thumbnail: '-thumb',
    }
    const suffix = variantSuffixes[size]
    
    // Check if URL already has a variant suffix
    const existingSuffix = Object.values(variantSuffixes).find(s => {
      // Match suffix before file extension
      const regex = new RegExp(`${s.replace('-', '\\-')}\\.(webp|jpg|jpeg|png|gif|svg)`, 'i')
      return regex.test(imageUrl)
    })
    
    // If it already has the requested variant suffix, return as is
    if (existingSuffix === suffix) {
      return imageUrl
    }
    
    // If it has a different variant, try to replace it
    if (existingSuffix && suffix) {
      const regex = new RegExp(`(${existingSuffix.replace('-', '\\-')})\\.(webp|jpg|jpeg|png|gif|svg)`, 'i')
      return imageUrl.replace(regex, `${suffix}.$2`)
    }
    
    // No variant suffix (e.g. AI-generated single file: blog/ai/123.webp).
    // Do NOT invent -mobile/-desktop URLs — those files don't exist. Use optimization API instead.
    
    // Fallback: Use optimization API for Firebase Storage images without variants
    const widths = {
      desktop: 1920,
      mobile: 768,
      thumbnail: 400,
    }
    const width = widths[size] || widths.desktop
    
    const params = new URLSearchParams({
      url: imageUrl,
      w: width.toString(),
      q: size === 'thumbnail' ? '75' : size === 'mobile' ? '80' : '85',
    })
    return `/api/image-optimize?${params.toString()}`
  }

  // For external images, use optimization API if we want optimization
  // Otherwise return original (external services might have their own optimization)
  const widths = {
    desktop: 1920,
    mobile: 768,
    thumbnail: 400,
  }
  const width = widths[size] || widths.desktop

  // Use optimization API for external images too (optional - can be removed if you prefer)
  const params = new URLSearchParams({
    url: imageUrl,
    w: width.toString(),
    q: size === 'thumbnail' ? '75' : size === 'mobile' ? '80' : '85',
  })
  return `/api/image-optimize?${params.toString()}`
}

/**
 * Transform HTML content to use optimized images
 * Adds srcset and sizes attributes for responsive images
 * @param {string} htmlContent - Original HTML content
 * @returns {string} - Transformed HTML with optimized images
 */
export function transformBlogContentImages(htmlContent) {
  if (!htmlContent) return htmlContent

  // Create a temporary DOM-like parser (using regex for server-side)
  // Match img tags
  const imgTagRegex = /<img([^>]*?)>/gi
  
  return htmlContent.replace(imgTagRegex, (match, attributes) => {
    // Extract src attribute
    const srcMatch = attributes.match(/src=["']([^"']+)["']/i)
    if (!srcMatch) return match

    const originalSrc = srcMatch[1]
    
    // Skip if it's already optimized or is a data URI
    if (originalSrc.includes('api/image-optimize') || originalSrc.startsWith('data:')) {
      return match
    }

    // Get optimized URLs for different sizes
    const desktopUrl = getOptimizedImageUrl(originalSrc, 'desktop')
    const mobileUrl = getOptimizedImageUrl(originalSrc, 'mobile')

    // Build new attributes
    let newAttributes = attributes
    
    // Replace src with mobile URL (default, will be overridden by srcset on larger screens)
    newAttributes = newAttributes.replace(/src=["'][^"']+["']/i, `src="${mobileUrl}"`)
    
    // Add srcset for responsive images
    if (!attributes.includes('srcset=')) {
      const srcset = `${mobileUrl} 768w, ${desktopUrl} 1920w`
      newAttributes += ` srcset="${srcset}"`
    }
    
    // Add sizes attribute for proper responsive loading
    if (!attributes.includes('sizes=')) {
      newAttributes += ` sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"`
    }
    
    // Add loading="lazy" if not present
    if (!attributes.includes('loading=')) {
      newAttributes += ` loading="lazy"`
    }

    return `<img${newAttributes}>`
  })
}

/**
 * Get responsive image props for Next.js Image component
 * @param {string} imageUrl - Original image URL
 * @param {object} options - Additional options
 * @returns {object} - Props for Next.js Image component
 */
export function getResponsiveImageProps(imageUrl, options = {}) {
  const {
    priority = false,
    alt = '',
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px',
  } = options

  // If image URL includes variant suffixes, use them for srcset
  if (imageUrl.includes('storage.googleapis.com')) {
    const baseUrl = imageUrl.replace(/-(desktop|mobile|thumb)\./, '.')
    const mobileUrl = imageUrl.includes('-mobile.') ? imageUrl : getOptimizedImageUrl(baseUrl, 'mobile')
    const desktopUrl = imageUrl.includes('-desktop.') ? imageUrl : getOptimizedImageUrl(baseUrl, 'desktop')

    return {
      src: desktopUrl, // Default to desktop
      alt,
      priority,
      sizes,
      // Next.js Image will handle srcset automatically if we provide the right URLs
    }
  }

  return {
    src: imageUrl,
    alt,
    priority,
    sizes,
  }
}

