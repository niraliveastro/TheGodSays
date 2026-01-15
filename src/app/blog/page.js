/**
 * Blog Listing Page
 * SEO-optimized page displaying all published blog posts
 * Server-side rendered for better SEO crawling
 */

import { getPublishedBlogs } from '@/lib/blog'
import { generateExcerpt, calculateReadTime } from '@/lib/blog-utils'
import { getOptimizedImageUrl } from '@/lib/image-optimize'
import Image from 'next/image'
import { Suspense } from 'react'
import BlogListClient from './BlogListClient'
import BlogFilters from './BlogFilters'
import BlogFloatingCTA from './BlogFloatingCTA'
import BlogTextFixer from './BlogTextFixer'
import BackButtonHandler from './BackButtonHandler'
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
    other: {
      'font-display': 'block',
    },
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
    <>
      {/* PRE-HYDRATION SCRIPT - Runs IMMEDIATELY before React loads */}
      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          // Apply styles immediately on page load
          const style = document.createElement('style');
          style.id = 'emergency-text-fix';
          style.textContent = \`
            html, body, * {
              text-align: left !important;
              text-justify: none !important;
              word-spacing: 0 !important;
              letter-spacing: 0 !important;
              text-align-last: left !important;
            }
            .blog-hero, .blog-hero * {
              text-align: center !important;
              text-align-last: center !important;
            }
          \`;
          document.head.insertBefore(style, document.head.firstChild);
        })();
      `}} />
      
      {/* IMMEDIATE STYLE RESET - Applied before React hydration */}
      <style dangerouslySetInnerHTML={{__html: `
        /* FORCE RESET ALL TEXT PROPERTIES GLOBALLY FOR BLOG PAGE */
        html, body {
          text-align: left !important;
          text-justify: none !important;
          word-spacing: 0 !important;
          letter-spacing: 0 !important;
        }
        
        /* Immediate CSS injection with maximum specificity */
        .blog-listing-page,
        .blog-listing-page *,
        .blog-listing-page .blog-card,
        .blog-listing-page .blog-card *,
        .blog-listing-page .blog-content,
        .blog-listing-page .blog-content *,
        .blog-listing-page .blog-title,
        .blog-listing-page .blog-excerpt,
        .blog-listing-page .blog-meta,
        .blog-listing-page .blog-meta *,
        .blog-listing-page .blog-meta-date,
        .blog-listing-page .blog-meta-author,
        .blog-listing-page p,
        .blog-listing-page h2,
        .blog-listing-page span,
        .blog-listing-page div {
          text-align: left !important;
          text-align-last: left !important;
          text-justify: none !important;
          word-spacing: 0px !important;
          letter-spacing: 0px !important;
          hyphens: none !important;
          -webkit-hyphens: none !important;
          -moz-hyphens: none !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
          font-feature-settings: normal !important;
          font-variant: normal !important;
          text-rendering: optimizeLegibility !important;
        }
        
        /* Hero needs center alignment */
        .blog-listing-page .blog-hero,
        .blog-listing-page .blog-hero *,
        .blog-listing-page .blog-hero h1,
        .blog-listing-page .blog-hero p {
          text-align: center !important;
          text-align-last: center !important;
        }
        
        /* Meta author needs right alignment */
        .blog-listing-page .blog-meta-author {
          text-align: right !important;
          text-align-last: right !important;
        }
      `}} />
      
      <div className="blog-listing-page" key={categoryFilter}>
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
                    <a href={`/blog/${blog.slug}`} className="blog-card">
                      {/* Featured Image with Category Overlay */}
                      {blog.featuredImage && (
                        <div className="blog-image">
                          <Image
                            src={getOptimizedImageUrl(blog.featuredImage, 'mobile')}
                            alt={blog.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                          {/* Category Overlay Text */}
                          <span className="blog-category-overlay">{primaryCategory}</span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="blog-content">
                        {/* Meta Info - Date by Author */}
                        <div className="blog-meta">
                          <span className="blog-meta-date">{publishedDate}</span>
                          {blog.author && (
                            <span className="blog-meta-author">by {blog.author}</span>
                          )}
                        </div>

                        {/* Title */}
                        <h2 className="blog-title">{blog.title}</h2>

                        {/* Excerpt */}
                        {excerpt && <p className="blog-excerpt">{excerpt}</p>}
                      </div>
                    </a>
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
      
      {/* Text alignment fixer - prevents spreading on navigation */}
      <BlogTextFixer />
      
      {/* Back button handler - forces reload when navigating back from blog detail */}
      <BackButtonHandler />

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
    </>
  )
}
