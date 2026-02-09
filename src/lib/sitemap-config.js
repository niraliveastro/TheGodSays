/**
 * Sitemap config: SITE_URL, optional overrides (STATIC_PATHS), and discovered routes.
 * Pages are auto-discovered by scanning src/app for page.js – no manual add needed.
 * Use STATIC_PATHS only to override priority/changeFrequency for specific paths.
 */

import { discoverAppRoutes } from './discover-routes'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://niraliveastro.com'

/**
 * Full list of static routes (from codebase). Used as fallback when discovery fails and for priority/changeFrequency overrides.
 * Discovery adds any new page.js under src/app automatically; this list ensures no page is missing from sitemap.
 */
// Restricted pages that should NOT appear in sitemap (noindex)
const RESTRICTED_PATHS = new Set([
  'appointments',
  'appointments/availability',
  'call-history',
  'wallet',
  'profile/astrology',
  'profile/family',
  'profile/user',
  'astrologer-dashboard',
  'astrologer-dashboard/pricing',
  'auth',
  'auth/astrologer',
  'auth/user',
  'unauthorized',
])

export const STATIC_PATHS = [
  // Core SEO Pages (High Priority) - NEW URLs
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: 'talk-to-astrologer', changeFrequency: 'daily', priority: 0.9 },
  { path: 'kundli-matching', changeFrequency: 'weekly', priority: 0.9 },
  { path: 'kundli-prediction', changeFrequency: 'daily', priority: 0.9 },
  { path: 'kundli-prediction/ai', changeFrequency: 'daily', priority: 0.8 },
  { path: 'cosmic-events', changeFrequency: 'daily', priority: 0.8 },
  { path: 'planetary-transits', changeFrequency: 'daily', priority: 0.8 },
  { path: 'numerology', changeFrequency: 'weekly', priority: 0.8 },
  { path: 'panchang/calendar', changeFrequency: 'daily', priority: 0.8 },
  
  // Blog (High Priority)
  { path: 'blog', changeFrequency: 'daily', priority: 0.9 },
  
  // Other Important Pages - NEW URLs
  { path: 'kundli', changeFrequency: 'weekly', priority: 0.8 },
  { path: 'kundli/personalized', changeFrequency: 'daily', priority: 0.7 },
  { path: 'panchang', changeFrequency: 'daily', priority: 0.8 },
  { path: 'panchang/personalized', changeFrequency: 'daily', priority: 0.7 },
  { path: 'panchang/kundli', changeFrequency: 'weekly', priority: 0.7 },
  { path: 'panchang/choghadiya', changeFrequency: 'daily', priority: 0.7 },
  { path: 'panchang/hora', changeFrequency: 'daily', priority: 0.7 },
  { path: 'panchang/tithi', changeFrequency: 'daily', priority: 0.7 },
  { path: 'dashas/mahadasha', changeFrequency: 'weekly', priority: 0.7 },
  
  // Legal/Policy Pages
  { path: 'privacy-policy', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'terms-and-conditions', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'refund-policy', changeFrequency: 'monthly', priority: 0.5 },
]

const DEFAULT_CHANGE_FREQUENCY = 'weekly'
const DEFAULT_PRIORITY = 0.6

/** Build map path -> { changeFrequency, priority } from STATIC_PATHS */
function getStaticOverrides() {
  const map = new Map()
  for (const { path: p, changeFrequency, priority } of STATIC_PATHS) {
    map.set(p, { changeFrequency, priority })
  }
  return map
}

/**
 * Discover all app routes (from filesystem) and build sitemap entries.
 * New pages under src/app automatically appear; STATIC_PATHS only override priority/changeFrequency.
 * If discovery fails (e.g. Edge runtime, no fs), returns [] so caller can fall back to getStaticSitemapEntries.
 * @param {string} lastModified - ISO date string
 * @returns {Array<{ url: string, lastModified: string, changeFrequency: string, priority: number }>}
 */
export function getDiscoveredSitemapEntries(lastModified) {
  try {
    const overrides = getStaticOverrides()
    const paths = discoverAppRoutes()
    if (!paths || paths.length === 0) return getStaticSitemapEntries(lastModified)
    return paths
      .filter((p) => !RESTRICTED_PATHS.has(p)) // Exclude restricted pages
      .map((p) => {
        const config = overrides.get(p) || {
          changeFrequency: DEFAULT_CHANGE_FREQUENCY,
          priority: DEFAULT_PRIORITY,
        }
        return {
          url: p ? `${SITE_URL}/${p}` : SITE_URL,
          lastModified,
          changeFrequency: config.changeFrequency,
          priority: config.priority,
        }
      })
  } catch {
    return getStaticSitemapEntries(lastModified)
  }
}

/**
 * @deprecated Use getDiscoveredSitemapEntries for auto-discovered pages.
 * Build static sitemap entries from STATIC_PATHS only (no discovery).
 */
export function getStaticSitemapEntries(lastModified) {
  return STATIC_PATHS
    .filter(({ path: p }) => !RESTRICTED_PATHS.has(p)) // Exclude restricted pages
    .map(({ path: p, changeFrequency, priority }) => ({
      url: p ? `${SITE_URL}/${p}` : SITE_URL,
      lastModified,
      changeFrequency,
      priority,
    }))
}
