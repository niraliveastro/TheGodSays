/**
 * Blog Detail Page
 * SEO-optimized individual blog post page with full metadata
 * Light theme only - matches Rahunow theme with gold accents
 */

import { getBlogBySlug, getAllBlogSlugs } from '@/lib/blog'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import './blog-detail.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahunow.com'

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Generate static params for all blog posts (for SSG/ISR)
export async function generateStaticParams() {
  try {
    const slugs = await getAllBlogSlugs()
    return slugs.map((item) => ({
      slug: item.slug,
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

// Generate metadata for each blog post
export async function generateMetadata({ params }) {
  const { slug } = await params
  const blog = await getBlogBySlug(slug)

  if (!blog) {
    return {
      title: 'Blog Post Not Found | RahuNow',
    }
  }

  const title = blog.metaTitle || blog.title
  const description = blog.metaDescription || blog.content?.substring(0, 160).replace(/<[^>]*>/g, '') || 'Read this insightful astrology article on RahuNow.'
  const imageUrl = blog.featuredImage || `${SITE_URL}/og-image.png`
  const url = `${SITE_URL}/blog/${slug}`

  return {
    title: `${title} | RahuNow Blog`,
    description,
    keywords: blog.tags || ['vedic astrology', 'astrology', 'numerology', 'spiritual guidance'],
    authors: [{ name: blog.author || 'RahuNow' }],
    openGraph: {
      title,
      description,
      url,
      siteName: 'RahuNow',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: blog.title,
        },
      ],
      locale: 'en_US',
      type: 'article',
      publishedTime: blog.publishedAt,
      modifiedTime: blog.updatedAt || blog.publishedAt,
      authors: [blog.author || 'RahuNow'],
      tags: blog.tags || [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      creator: '@rahunow',
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params
  const blog = await getBlogBySlug(slug)

  if (!blog) {
    notFound()
  }

  const publishedDate = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const updatedDate = blog.updatedAt && blog.updatedAt !== blog.publishedAt
    ? new Date(blog.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const content = blog.content || ''

  return (
    <div className="blog-detail-page">
      {/* Back to Blog Link */}
      <div className="blog-article">
        <Link href="/blog" className="blog-back-link">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Blog
        </Link>

        {/* Featured Image */}
        {blog.featuredImage && (
          <div className="blog-featured-image">
            <Image
              src={blog.featuredImage}
              alt={blog.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 900px"
            />
          </div>
        )}

        {/* Article Header */}
        <header className="blog-header">
          <h1 className="blog-title">{blog.title}</h1>

          {/* Meta Information */}
          <div className="blog-meta">
            {publishedDate && (
              <div className="blog-meta-item">
                <svg className="blog-meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Published: {publishedDate}
              </div>
            )}
            {updatedDate && (
              <div className="blog-meta-item">
                <svg className="blog-meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Updated: {updatedDate}
              </div>
            )}
            {blog.author && (
              <div className="blog-meta-item">
                <svg className="blog-meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                By {blog.author}
              </div>
            )}
          </div>

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="blog-tags">
              {blog.tags.map((tag, idx) => (
                <span key={idx} className="blog-tag">{tag}</span>
              ))}
            </div>
          )}
        </header>

        {/* Article Content */}
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: content }} />
      </div>

      {/* Schema.org JSON-LD for BlogPosting */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: blog.title,
            description: blog.metaDescription || blog.content?.substring(0, 160).replace(/<[^>]*>/g, '') || '',
            image: blog.featuredImage || `${SITE_URL}/og-image.png`,
            datePublished: blog.publishedAt,
            dateModified: blog.updatedAt || blog.publishedAt,
            author: {
              '@type': 'Organization',
              name: blog.author || 'RahuNow',
            },
            publisher: {
              '@type': 'Organization',
              name: 'RahuNow',
              url: SITE_URL,
              logo: {
                '@type': 'ImageObject',
                url: `${SITE_URL}/icon-512x512.png`,
              },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `${SITE_URL}/blog/${slug}`,
            },
            keywords: blog.tags?.join(', ') || 'vedic astrology, astrology, numerology',
          }),
        }}
      />
    </div>
  )
}
