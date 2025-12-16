/**
 * Blog Detail Page
 * SEO-optimized individual blog post page with full metadata
 */

import { getBlogBySlug, getAllBlogSlugs } from '@/lib/blog'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahunow.com'

// Generate static params for all blog posts (for SSG/ISR)
export async function generateStaticParams() {
  const slugs = await getAllBlogSlugs()
  return slugs.map((item) => ({
    slug: item.slug,
  }))
}

// Generate metadata for each blog post
export async function generateMetadata({ params }) {
  const blog = await getBlogBySlug(params.slug)

  if (!blog) {
    return {
      title: 'Blog Post Not Found | RahuNow',
    }
  }

  const title = blog.metaTitle || blog.title
  const description = blog.metaDescription || blog.content?.substring(0, 160).replace(/<[^>]*>/g, '') || 'Read this insightful astrology article on RahuNow.'
  const imageUrl = blog.featuredImage || `${SITE_URL}/og-image.png`
  const url = `${SITE_URL}/blog/${blog.slug}`

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
  const blog = await getBlogBySlug(params.slug)

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

  // Parse content - if it's HTML, render it; if it's markdown, we'll need a markdown renderer
  // For now, we'll assume HTML content
  const content = blog.content || ''

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Back to Blog Link */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          href="/blog"
          className="inline-flex items-center text-amber-400 hover:text-amber-300 transition-colors mb-8"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Blog
        </Link>
      </div>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Featured Image */}
        {blog.featuredImage && (
          <div className="relative w-full h-64 sm:h-96 mb-8 rounded-xl overflow-hidden border border-gray-700/50">
            <Image
              src={blog.featuredImage}
              alt={blog.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
            />
          </div>
        )}

        {/* Title */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 mb-4">
            {blog.title}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6">
            {publishedDate && (
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Published: {publishedDate}
              </div>
            )}
            {updatedDate && (
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Updated: {updatedDate}
              </div>
            )}
            {blog.author && (
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                By {blog.author}
              </div>
            )}
          </div>

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-sm font-medium bg-amber-900/30 text-amber-300 rounded-full border border-amber-700/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Article Content */}
        <div
          className="prose prose-invert prose-lg max-w-none
            prose-headings:text-amber-400
            prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4 prose-h1:mt-8
            prose-h2:text-2xl prose-h2:font-bold prose-h2:mb-3 prose-h2:mt-6
            prose-h3:text-xl prose-h3:font-semibold prose-h3:mb-2 prose-h3:mt-4
            prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
            prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-100 prose-strong:font-semibold
            prose-ul:text-gray-300 prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4
            prose-ol:text-gray-300 prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4
            prose-li:mb-2
            prose-blockquote:border-l-4 prose-blockquote:border-amber-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400
            prose-code:text-amber-300 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-img:rounded-lg prose-img:border prose-img:border-gray-700
            prose-hr:border-gray-700"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </article>

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
              '@id': `${SITE_URL}/blog/${blog.slug}`,
            },
            keywords: blog.tags?.join(', ') || 'vedic astrology, astrology, numerology',
          }),
        }}
      />
    </div>
  )
}
