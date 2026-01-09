/**
 * Blog Listing Page
 * SEO-optimized page displaying all published blog posts
 * Server-side rendered for better SEO crawling
 */

import { getPublishedBlogs } from '@/lib/blog'
import { generateExcerpt } from '@/lib/blog-utils'
import { getOptimizedImageUrl } from '@/lib/image-optimize'
import Image from 'next/image'
import Link from 'next/link'
import BlogListClient from './BlogListClient'
import './blog.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://niraliveastro.com'

// Enable ISR (Incremental Static Regeneration) - revalidate every 60 seconds
export const revalidate = 60

// Generate metadata for SEO
export async function generateMetadata() {
  const blogs = await getPublishedBlogs()
  
  return {
    title: 'Astrology Blog | Vedic Astrology Articles & Insights | NiraLive Astro',
    description: 'Discover insightful articles on Vedic astrology, numerology, planetary influences, spiritual remedies, and cosmic guidance. Read expert astrology blogs on NiraLive Astro.',
    keywords: ['vedic astrology', 'astrology blog', 'numerology', 'planetary influences', 'spiritual remedies', 'astrology articles', 'cosmic guidance', 'horoscope insights'],
    authors: [{ name: 'NiraLive Astro' }],
    openGraph: {
      title: 'Astrology Blog | NiraLive Astro',
      description: 'Discover insights on Vedic astrology, numerology, planetary influences, and spiritual remedies',
      url: `${SITE_URL}/blog`,
      siteName: 'NiraLive Astro',
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'NiraLive Astro Astrology Blog',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Astrology Blog | NiraLive Astro',
      description: 'Discover insights on Vedic astrology, numerology, planetary influences, and spiritual remedies',
      images: [`${SITE_URL}/og-image.png`],
      creator: '@niraliveastro',
    },
    alternates: {
      canonical: `${SITE_URL}/blog`,
    },
  }
}

export default async function BlogPage() {
  // Fetch blogs server-side for initial render (SEO-friendly)
  const blogs = await getPublishedBlogs()

  return (
    <div className="blog-listing-page">
      {/* Hero Section */}
      <div className="blog-hero" style={{ paddingTop: '0.01rem', marginTop: '0.01rem' }}>
        <h1>Astrology Blog</h1>
        <p>Discover insights on Vedic astrology, numerology, planetary influences, and spiritual remedies</p>
      </div>

      {/* Blog Posts Grid - Server-rendered for SEO */}
      <div className="blog-container" style={{ paddingTop: '0.01rem', marginTop: '0.01rem' }}>
        {blogs.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="empty-title">No blog posts yet</h2>
            <p className="empty-text">Check back soon for insightful astrology articles!</p>
          </div>
        ) : (
          <>
            {/* Server-rendered blog list for SEO */}
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
                  <div key={blog.id} className="blog-card-wrapper">
                    <Link href={`/blog/${blog.slug}`} className="blog-card">
                      {/* Featured Image */}
                      {blog.featuredImage && (
                        <div className="blog-image">
                          <Image
                            src={getOptimizedImageUrl(blog.featuredImage, 'mobile')}
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
                  </div>
                )
              })}
            </div>

            {/* Client component for real-time updates (hidden from crawlers, but enhances UX) */}
            <BlogListClient initialBlogs={blogs} />
          </>
        )}
      </div>

      {/* Schema.org JSON-LD for Blog/CollectionPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Astrology Blog | NiraLive Astro',
            description: 'Discover insights on Vedic astrology, numerology, planetary influences, and spiritual remedies',
            url: `${SITE_URL}/blog`,
            publisher: {
              '@type': 'Organization',
              name: 'NiraLive Astro',
              url: SITE_URL,
              logo: {
                '@type': 'ImageObject',
                url: `${SITE_URL}/icon-512x512.png`,
              },
            },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: blogs.length,
              itemListElement: blogs.slice(0, 10).map((blog, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                  '@type': 'BlogPosting',
                  headline: blog.title,
                  description: blog.metaDescription || generateExcerpt(blog.content || '', 160),
                  url: `${SITE_URL}/blog/${blog.slug}`,
                  datePublished: blog.publishedAt,
                  dateModified: blog.updatedAt || blog.publishedAt,
                  image: blog.featuredImage || `${SITE_URL}/og-image.png`,
                  author: {
                    '@type': 'Organization',
                    name: blog.author || 'NiraLive Astro',
                  },
                },
              })),
            },
          }),
        }}
      />
    </div>
  )
}
