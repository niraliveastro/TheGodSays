/**
 * Blog Detail Page
 * SEO-optimized individual blog post page with full metadata
 * Light theme only - matches NiraLive Astro theme with gold accents
 */

import { getBlogBySlug, getAllBlogSlugs, getPublishedBlogs } from "@/lib/blog";
import { generateExcerpt } from "@/lib/blog-utils";
import {
  transformBlogContentImages,
  getOptimizedImageUrl,
} from "@/lib/image-optimize";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import "./blog-detail.css";
import BlogFloatingCTA from './BlogFloatingCTA'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://niraliveastro.com";

// Use ISR (Incremental Static Regeneration) for better SEO
// Revalidate every 60 seconds to keep content fresh while allowing static generation
export const revalidate = 60;

// Generate static params for all blog posts (for SSG/ISR)
export async function generateStaticParams() {
  try {
    const slugs = await getAllBlogSlugs();
    return slugs.map((item) => ({
      slug: item.slug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

// Generate metadata for each blog post
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return {
      title: "Blog Post Not Found | NiraLive Astro",
    };
  }

  const title = blog.metaTitle || blog.title;
  const description =
    blog.metaDescription ||
    blog.content?.substring(0, 160).replace(/<[^>]*>/g, "") ||
    "Read this insightful astrology article on NiraLive Astro.";
  const imageUrl = blog.featuredImage || `${SITE_URL}/og-image.png`;
  const url = `${SITE_URL}/blog/${slug}`;

  return {
    title: `${title} | NiraLive Astro Blog`,
    description,
    keywords: blog.tags || [
      "vedic astrology",
      "astrology",
      "numerology",
      "spiritual guidance",
    ],
    authors: [{ name: blog.author || "NiraLive Astro" }],
    openGraph: {
      title,
      description,
      url,
      siteName: "NiraLive Astro",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: blog.title,
        },
      ],
      locale: "en_US",
      type: "article",
      publishedTime: blog.publishedAt,
      modifiedTime: blog.updatedAt || blog.publishedAt,
      authors: [blog.author || "NiraLive Astro"],
      tags: blog.tags || [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
      creator: "@niraliveastro",
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  // Fetch related blogs (exclude current blog)
  const allBlogs = await getPublishedBlogs();
  const relatedBlogs = allBlogs
    .filter((b) => b.id !== blog.id && b.slug !== slug)
    .slice(0, 6); // Show up to 6 related blogs

  const publishedDate = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const updatedDate =
    blog.updatedAt && blog.updatedAt !== blog.publishedAt
      ? new Date(blog.updatedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  // Transform content to use optimized images
  const content = transformBlogContentImages(blog.content || "");

  // Get optimized featured image URL (use desktop variant for featured image)
  const optimizedFeaturedImage = blog.featuredImage
    ? getOptimizedImageUrl(blog.featuredImage, "desktop")
    : null;

  return (
    <div className="blog-detail-page">
      {/* Back to Blog Link */}
      <div className="blog-article">
        <Link href="/blog" className="blog-back-link">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            width="20"
            height="20"
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

        {/* Featured Image */}
        {optimizedFeaturedImage && (
          <div className="blog-featured-image">
            <Image
              src={optimizedFeaturedImage}
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
                <svg
                  className="blog-meta-icon"
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
                {publishedDate}
              </div>
            )}

            {blog.author && (
              <div className="blog-meta-item">
                <svg
                  className="blog-meta-icon"
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
        </header>
        {/* CTA Section - Floating */}
        <BlogFloatingCTA />

        {/* Article Content */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="blog-tags">
            {blog.tags.map((tag, idx) => (
              <span key={idx} className="blog-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Related Blogs Section */}
      {relatedBlogs.length > 0 && (
        <div className="related-blogs-section">
          <div className="related-blogs-container">
            <h2 className="related-blogs-title">More Articles</h2>
            <p className="related-blogs-subtitle">
              Continue reading our latest astrology insights
            </p>

            <div className="related-blogs-grid">
              {relatedBlogs.map((relatedBlog) => {
                const excerpt = generateExcerpt(
                  relatedBlog.content || relatedBlog.excerpt || "",
                  120
                );
                const relatedPublishedDate = relatedBlog.publishedAt
                  ? new Date(relatedBlog.publishedAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )
                  : "";

                // Get primary category from first tag
                const primaryCategory = relatedBlog.tags && relatedBlog.tags.length > 0 ? relatedBlog.tags[0] : 'Article'
                
                // Format date like blog listing page
                const formattedDate = relatedBlog.publishedAt
                  ? new Date(relatedBlog.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : ''

                return (
                  <div key={relatedBlog.id} className="related-blog-card-wrapper">
                    <Link
                      href={`/blog/${relatedBlog.slug}`}
                      className="related-blog-card"
                    >
                      {/* Featured Image with Category Overlay */}
                      {relatedBlog.featuredImage && (
                        <div className="related-blog-image">
                          <Image
                            src={getOptimizedImageUrl(
                              relatedBlog.featuredImage,
                              "mobile"
                            )}
                            alt={relatedBlog.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                          {/* Category Overlay Text */}
                          <span className="related-blog-category-overlay">{primaryCategory}</span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="related-blog-content">
                        {/* Meta Info - Date by Author */}
                        <div className="related-blog-meta">
                          {formattedDate && (
                            <span className="related-blog-meta-date">{formattedDate}</span>
                          )}
                          {relatedBlog.author && (
                            <span className="related-blog-meta-author">by {relatedBlog.author}</span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="related-blog-title">
                          {relatedBlog.title}
                        </h3>

                        {/* Excerpt */}
                        {excerpt && (
                          <p className="related-blog-excerpt">{excerpt}</p>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Schema.org JSON-LD for BlogPosting */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: blog.title,
            description:
              blog.metaDescription ||
              blog.content?.substring(0, 160).replace(/<[^>]*>/g, "") ||
              "",
            image: blog.featuredImage || `${SITE_URL}/og-image.png`,
            datePublished: blog.publishedAt,
            dateModified: blog.updatedAt || blog.publishedAt,
            author: {
              "@type": "Organization",
              name: blog.author || "NiraLive Astro",
            },
            publisher: {
              "@type": "Organization",
              name: "NiraLive Astro",
              url: SITE_URL,
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/icon-512x512.png`,
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${SITE_URL}/blog/${slug}`,
            },
            keywords:
              blog.tags?.join(", ") || "vedic astrology, astrology, numerology",
          }),
        }}
      />
    </div>
  );
}
