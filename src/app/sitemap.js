import { getAllBlogSlugs } from '@/lib/blog'
import { getDiscoveredSitemapEntries, getStaticSitemapEntries, SITE_URL } from '@/lib/sitemap-config'

// Force Node.js runtime so fs-based route discovery works (same as API); otherwise sitemap.xml would miss discovered pages
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function sitemap() {
  const lastModified = new Date().toISOString()

  // Auto-discovered pages (any page.js under src/app). If discovery fails (e.g. wrong runtime), fall back to STATIC_PATHS so count matches admin.
  let staticPages
  try {
    staticPages = getDiscoveredSitemapEntries(lastModified)
    if (!staticPages || staticPages.length === 0) {
      staticPages = getStaticSitemapEntries(lastModified)
    }
  } catch {
    staticPages = getStaticSitemapEntries(lastModified)
  }

  const blogSlugs = await getAllBlogSlugs()
  const blogPages = blogSlugs.map((item) => ({
    url: `${SITE_URL}/blog/${item.slug}`,
    lastModified: item.publishedAt || lastModified,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticPages, ...blogPages]
}
