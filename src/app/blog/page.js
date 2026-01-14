/**
 * Blog Listing Page
 * SEO-optimized page displaying all published blog posts
 * Server-side rendered for better SEO crawling
 */

import { getPublishedBlogs } from '@/lib/blog'
import { generateExcerpt, calculateReadTime } from '@/lib/blog-utils'
import { getOptimizedImageUrl } from '@/lib/image-optimize'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import BlogListClient from './BlogListClient'
import BlogFilters from './BlogFilters'
import BlogFloatingCTA from './BlogFloatingCTA'
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

export default async function BlogPage({ searchParams }) {
  // Fetch blogs server-side for initial render (SEO-friendly)
  const allBlogs = await getPublishedBlogs()
  
  // Await searchParams in Next.js 15+
  const params = await searchParams
  
  // Filter blogs based on category parameter
  let categoryFilter = 'all'
  if (params?.category) {
    try {
      categoryFilter = decodeURIComponent(params.category).toLowerCase().trim()
    } catch (e) {
      // Fallback if decoding fails
      categoryFilter = params.category.toLowerCase().trim()
    }
  }
  
  // Category mapping function (matches BlogFilters.js logic)
  const mapTagToCategory = (tag) => {
    const normalizedTag = tag.toLowerCase().trim()
    
    // Primary categories
    const primaryCategories = [
      'Love & Relationships',
      'Marriage & Match Making',
      'Career & Job',
      'Business & Money',
      'Health & Well-Being',
      'Sleep & Mental Peace',
      'Home & Vastu',
      'Spiritual Growth',
      'Daily / Monthly Predictions'
    ]
    
    // Secondary categories
    const secondaryCategories = [
      'Astrology Basics',
      'Planets & Grahas',
      'Houses (Bhavas)',
      'Yogas & Doshas',
      'Remedies & Upay',
      'Dasha & Transits',
      'Muhurat & Auspicious Time',
      'Panchang',
      'Festivals & Rituals',
      'Yearly Forecasts'
    ]
    
    // Check primary categories
    for (const category of primaryCategories) {
      const catNormalized = category.toLowerCase().replace(/[&/]/g, '').replace(/\s+/g, '')
      if (normalizedTag.includes(catNormalized) || catNormalized.includes(normalizedTag)) {
        return category.toLowerCase().trim()
      }
    }
    
    // Check secondary categories
    for (const category of secondaryCategories) {
      const catNormalized = category.toLowerCase().replace(/[&()]/g, '').replace(/\s+/g, '')
      if (normalizedTag.includes(catNormalized) || catNormalized.includes(normalizedTag)) {
        return category.toLowerCase().trim()
      }
    }
    
    // Common mappings
    const mappings = {
      'vastu': 'home & vastu',
      'relationship': 'love & relationships',
      'marriage': 'marriage & match making',
      'career': 'career & job',
      'business': 'business & money',
      'health': 'health & well-being',
      'sleep': 'sleep & mental peace',
      'spiritual': 'spiritual growth',
      'prediction': 'daily / monthly predictions',
      'astrology': 'astrology basics',
      'planet': 'planets & grahas',
      'house': 'houses (bhavas)',
      'yoga': 'yogas & doshas',
      'remedy': 'remedies & upay',
      'dasha': 'dasha & transits',
      'muhurat': 'muhurat & auspicious time',
      'panchang': 'panchang',
      'festival': 'festivals & rituals'
    }
    
    for (const [key, category] of Object.entries(mappings)) {
      if (normalizedTag.includes(key)) {
        return category
      }
    }
    
    return normalizedTag
  }

  const blogs = categoryFilter === 'all' 
    ? allBlogs 
    : allBlogs.filter(blog => {
        if (!blog.tags || !Array.isArray(blog.tags)) return false
        return blog.tags.some(tag => {
          const mappedCategory = mapTagToCategory(tag)
          return mappedCategory === categoryFilter
        })
      })

  return (
    <div className="blog-listing-page">
      {/* Hero Section */}
      <div className="blog-hero" style={{ paddingTop: '0.25rem', marginTop: '0.01rem' }}>
        <h1>Astrology Blog</h1>
        <p>Discover insights on Vedic astrology, numerology, planetary influences, and spiritual remedies</p>
      </div>

      {/* Category Filters */}
      <Suspense fallback={<div className="blog-filters"><div className="blog-filter-btn">Loading...</div></div>}>
        <BlogFilters blogs={allBlogs} />
      </Suspense>

      {/* Blog Posts Grid - Server-rendered for SEO */}
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
          <>
            {/* Server-rendered blog list for SEO */}
            <div className="blog-grid">
              {blogs.map((blog) => {
                const excerpt = generateExcerpt(blog.content || blog.excerpt || '', 100)
                const readTime = calculateReadTime(blog.content || '')
                const publishedDate = blog.publishedAt
                  ? new Date(blog.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : ''
                
                // Get primary category from first tag
                const primaryCategory = blog.tags && blog.tags.length > 0 ? blog.tags[0] : 'Article'

                return (
                  <div key={blog.id} className="blog-card-wrapper">
                    <Link href={`/blog/${blog.slug}`} className="blog-card">
                      {/* Featured Image with Category Pill */}
                      {blog.featuredImage && (
                        <div className="blog-image">
                          <Image
                            src={getOptimizedImageUrl(blog.featuredImage, 'mobile')}
                            alt={blog.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                          {/* Category Pill */}
                          <span className="blog-category-pill">{primaryCategory}</span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="blog-content">
                        {/* Title */}
                        <h2 className="blog-title">{blog.title}</h2>

                        {/* Excerpt */}
                        {excerpt && <p className="blog-excerpt">{excerpt}</p>}

                        {/* Meta Info */}
                        <div className="blog-meta">
                          <div className="blog-meta-item">
                            <svg className="blog-meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="blog-read-time">{readTime} min read</span>
                          </div>
                          <div className="blog-meta-item">
                            <svg className="blog-meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{publishedDate}</span>
                          </div>
                          {blog.author && (
                            <div className="blog-meta-item">
                              <svg className="blog-meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="blog-author">By {blog.author}</span>
                            </div>
                          )}
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

      {/* Floating CTA */}
      <BlogFloatingCTA />

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
