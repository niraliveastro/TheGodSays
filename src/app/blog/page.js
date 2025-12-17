/**
 * Blog Listing Page
 * SEO-optimized page displaying all published blog posts
 * Light theme only - matches Rahunow theme with gold accents
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { customImageLoader } from '@/lib/image-loader'
import './blog.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rahunow.com'

// Helper function to generate excerpt
function generateExcerpt(html, maxLength = 120) {
  const text = html.replace(/<[^>]*>/g, '').trim()
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export default function BlogPage() {
  const router = useRouter()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const { toasts, removeToast, success, error } = useToast()

  useEffect(() => {
    async function fetchBlogs() {
      try {
        // Add cache-busting timestamp to ensure fresh data
        const response = await fetch(`/api/blog?status=published&_t=${Date.now()}`, {
          cache: 'no-store',
        })
        const data = await response.json()
        if (response.ok) {
          setBlogs(data.blogs || [])
        } else {
          console.error('[Blog Page] API error:', data.error)
        }
      } catch (error) {
        console.error('[Blog Page] Error fetching blogs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchBlogs()
    
    // Refresh blogs every 30 seconds to catch new posts
    const interval = setInterval(fetchBlogs, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="blog-listing-page">
      {/* Hero Section */}
      <div className="blog-hero">
        <h1>Astrology Blog</h1>
        <p>Discover insights on Vedic astrology, numerology, planetary influences, and spiritual remedies</p>
        <div className="blog-hero-actions">
          <button 
            onClick={() => router.push('/admin/blog')}
            className="blog-create-btn"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Blog Post
          </button>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="blog-container">
        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner"></div>
            <p className="empty-text">Loading blog posts...</p>
          </div>
        ) : blogs.length === 0 ? (
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
                <div key={blog.id} className="blog-card-wrapper">
                  <Link href={`/blog/${blog.slug}`} className="blog-card">
                    {/* Featured Image */}
                    {blog.featuredImage && (
                      <div className="blog-image">
                        <Image
                          src={blog.featuredImage}
                          alt={blog.title}
                          loader={customImageLoader}
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
                  
                  {/* Admin Actions */}
                  <div className="blog-card-actions">
                    <Link 
                      href={`/admin/blog?edit=${blog.id}`}
                      className="blog-action-btn blog-action-edit"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Link>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this blog post?')) {
                          try {
                            const response = await fetch(`/api/blog/${blog.id}`, {
                              method: 'DELETE',
                            });
                            if (response.ok) {
                              success('Blog post deleted successfully!');
                              setBlogs(blogs.filter(b => b.id !== blog.id));
                            } else {
                              error('Failed to delete blog post');
                            }
                          } catch (err) {
                            error('Error deleting blog post');
                          }
                        }
                      }}
                      className="blog-action-btn blog-action-delete"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
