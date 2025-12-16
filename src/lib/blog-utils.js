/**
 * Client-safe blog utility functions
 * These functions don't import Firebase Admin and can be used in client components
 */

/**
 * Generate a URL-friendly slug from a title
 * @param {string} title - Blog title
 * @returns {string} URL-friendly slug
 */
export function generateSlug(title) {
  if (!title) return ''
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Generate excerpt from content (HTML or plain text)
 * @param {string} content - Blog content
 * @param {number} maxLength - Maximum length of excerpt (default: 150)
 * @returns {string} Excerpt
 */
export function generateExcerpt(content, maxLength = 150) {
  if (!content) return ''
  
  // Remove HTML tags if present
  const text = content.replace(/<[^>]*>/g, '').trim()
  
  if (text.length <= maxLength) return text
  
  // Find the last space before maxLength to avoid cutting words
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  return lastSpace > 0 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...'
}
