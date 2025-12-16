/**
 * Blog Listing Page
 * SEO-optimized page displaying all published blog posts
 * Light theme only - matches Rahunow theme with gold accents
 */

import { getPublishedBlogs, generateExcerpt } from '@/lib/blog'
import Link from 'next/link'
import Image from 'next/image'
import './blog.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahunow.com'

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Generate metadata for SEO
export async function generateMetadata() {
  return {
    title: 'Astrology Blog - Vedic Astrology Articles & Insights | RahuNow',
    description: 'Explore in-depth articles on Vedic astrology, numerology, planetary influences, remedies, and spiritual insights. Expert guidance on Rahu, Ketu, Kundli, and more.',
    keywords: [
      'vedic astrology blog',
      'astrology articles',
      'numerology blog',
      'kundli reading',
      'rahu ketu remedies',
      'astrology insights',
      'spiritual guidance',
      'hindu astrology',
      'jyotish articles',
      'planetary remedies'
    ],
    openGraph: {
      title: 'Astrology Blog - Vedic Astrology Articles & Insights | RahuNow',
      description: 'Explore in-depth articles on Vedic astrology, numerology, planetary influences, remedies, and spiritual insights.',
      url: `${SITE_URL}/blog`,
      siteName: 'RahuNow',
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'RahuNow Astrology Blog',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Astrology Blog - Vedic Astrology Articles & Insights | RahuNow',
      description: 'Explore in-depth articles on Vedic astrology, numerology, planetary influences, remedies, and spiritual insights.',
      images: [`${SITE_URL}/og-image.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/blog`,
    },
  }
}

export default async function BlogPage() {
  let blogs = []
  try {
    blogs = await getPublishedBlogs()
    console.log(`[Blog Page] Fetched ${blogs.length} published blogs`)
  } catch (error) {
    console.error('[Blog Page] Error fetching blogs:', error)
  }

  return (
    <div className="blog-listing-page">
      {/* Hero Section */}
      <div className="blog-hero">
        <h1>Astrology Blog</h1>
        <p>Discover insights on Vedic astrology, numerology, planetary influences, and spiritual remedies</p>
      </div>

      {/* Blog Posts Grid */}
      <div className="blog-container">
        {blogs.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="empty-title">No blog posts yet</h2>
            <p className="empty-text">Check back soon for insightful astrology articles!</p>
          </div>
        ) : (
          <div className="blog-grid">
            {blogs.map((blog) => {
              const excerpt = generateExcerpt(blog.content || blog.excerpt || '', 120)
              const publishedDate = blog.publishedAt
                ? new Date(blog.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : ''

              return (
                <Link key={blog.id} href={`/blog/${blog.slug}`} className="blog-card">
                  {/* Featured Image */}
                  {blog.featuredImage && (
                    <div className="blog-image">
                      <Image
                        src={blog.featuredImage}
                        alt={blog.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="blog-content">
                    {/* Tags */}
                    {blog.tags && blog.tags.length > 0 && (
                      <div className="blog-tags">
                        {blog.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="blog-tag">{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="blog-title">{blog.title}</h2>

                    {/* Excerpt */}
                    {excerpt && <p className="blog-excerpt">{excerpt}</p>}

                    {/* Meta Info */}
                    <div className="blog-meta">
                      <span>{publishedDate}</span>
                      {blog.author && <span className="blog-author">By {blog.author}</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Schema.org JSON-LD for Blog Listing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'RahuNow Astrology Blog',
            description: 'In-depth articles on Vedic astrology, numerology, planetary influences, and spiritual remedies',
            url: `${SITE_URL}/blog`,
            publisher: {
              '@type': 'Organization',
              name: 'RahuNow',
              url: SITE_URL,
            },
            blogPost: blogs.map((blog) => ({
              '@type': 'BlogPosting',
              headline: blog.title,
              url: `${SITE_URL}/blog/${blog.slug}`,
              datePublished: blog.publishedAt,
              dateModified: blog.updatedAt || blog.publishedAt,
              author: {
                '@type': 'Organization',
                name: blog.author || 'RahuNow',
              },
              description: blog.metaDescription || generateExcerpt(blog.content || '', 160),
            })),
          }),
        }}
      />
    </div>
  )
}
