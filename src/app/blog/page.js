/**
 * Blog Listing Page
 * SEO-optimized page displaying all published blog posts
 */

import { getPublishedBlogs, generateExcerpt } from '@/lib/blog'
import Link from 'next/link'
import Image from 'next/image'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahunow.com'

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
  const blogs = await getPublishedBlogs()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 mb-4">
              Astrology Blog
            </h1>
            <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto">
              Discover insights on Vedic astrology, numerology, planetary influences, and spiritual remedies
            </p>
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {blogs.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-4 bg-amber-900/20 rounded-full mb-4">
              <svg
                className="w-12 h-12 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-300 mb-2">No blog posts yet</h2>
            <p className="text-gray-400">Check back soon for insightful astrology articles!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                <Link
                  key={blog.id}
                  href={`/blog/${blog.slug}`}
                  className="group block bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/50 hover:border-amber-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-900/20"
                >
                  {/* Featured Image */}
                  {blog.featuredImage && (
                    <div className="relative w-full h-48 overflow-hidden bg-gray-700">
                      <Image
                        src={blog.featuredImage}
                        alt={blog.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    {/* Tags */}
                    {blog.tags && blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {blog.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs font-medium bg-amber-900/30 text-amber-300 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-100 mb-2 group-hover:text-amber-400 transition-colors line-clamp-2">
                      {blog.title}
                    </h2>

                    {/* Excerpt */}
                    {excerpt && (
                      <p className="text-gray-400 text-sm mb-4 line-clamp-3">{excerpt}</p>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{publishedDate}</span>
                      {blog.author && (
                        <span className="text-amber-400">By {blog.author}</span>
                      )}
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
