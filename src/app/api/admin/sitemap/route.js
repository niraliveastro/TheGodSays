import { NextResponse } from 'next/server'
import { getDiscoveredSitemapEntries, SITE_URL } from '@/lib/sitemap-config'
import { getAllBlogSlugs } from '@/lib/blog'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/sitemap
 * Returns all sitemap pages (auto-discovered + blog) for the Admin SiteMap tab.
 * New pages under src/app auto-appear; new blog posts auto-appear.
 */
export async function GET() {
  try {
    const lastModified = new Date().toISOString()

    const staticEntries = getDiscoveredSitemapEntries(lastModified)
    const staticPages = staticEntries.map((entry) => ({
      url: entry.url,
      path: entry.url.replace(SITE_URL, '').replace(/^\//, '') || '/',
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      type: 'static',
    }))

    const blogSlugs = await getAllBlogSlugs()
    const blogPages = blogSlugs.map((item) => ({
      url: `${SITE_URL}/blog/${item.slug}`,
      path: `blog/${item.slug}`,
      lastModified: item.publishedAt || lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
      type: 'blog',
    }))

    const pages = [...staticPages, ...blogPages]

    return NextResponse.json({ pages })
  } catch (error) {
    console.error('Admin sitemap API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load sitemap' },
      { status: 500 }
    )
  }
}
