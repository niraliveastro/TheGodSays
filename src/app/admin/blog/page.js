/**
 * Blog Admin Page
 * Simple interface for managing blog posts (add, edit, publish)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateSlug } from '@/lib/blog-utils'
import './admin-blog.css'

export default function BlogAdminPage() {
  const router = useRouter()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Form state
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    metaTitle: '',
    metaDescription: '',
    author: 'RahuNow',
    tags: '',
    featuredImage: '',
    status: 'draft',
  })

  // Fetch all blogs
  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/blog')
      const data = await response.json()

      if (response.ok) {
        setBlogs(data.blogs || [])
      } else {
        setError(data.error || 'Failed to fetch blogs')
      }
    } catch (err) {
      setError('Failed to fetch blogs: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Auto-generate slug from title
    if (name === 'title' && !editingId) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(value),
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : []

      const payload = {
        ...formData,
        tags: tagsArray,
      }

      let response
      if (editingId) {
        // Update existing blog
        response = await fetch(`/api/blog/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        // Create new blog
        response = await fetch('/api/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const data = await response.json()

      if (response.ok) {
        setSuccess(editingId ? 'Blog updated successfully!' : 'Blog created successfully!')
        resetForm()
        fetchBlogs()
        
        // If published, show link to view
        if (formData.status === 'published' && data.blog?.slug) {
          setTimeout(() => {
            window.open(`/blog/${data.blog.slug}`, '_blank')
          }, 1000)
        }
      } else {
        setError(data.error || 'Failed to save blog')
      }
    } catch (err) {
      setError('Failed to save blog: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (blog) => {
    setEditingId(blog.id)
    setFormData({
      title: blog.title || '',
      slug: blog.slug || '',
      content: blog.content || '',
      metaTitle: blog.metaTitle || blog.title || '',
      metaDescription: blog.metaDescription || '',
      author: blog.author || 'RahuNow',
      tags: blog.tags?.join(', ') || '',
      featuredImage: blog.featuredImage || '',
      status: blog.status || 'draft',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this blog post?')) {
      return
    }

    try {
      const response = await fetch(`/api/blog/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Blog deleted successfully!')
        fetchBlogs()
        if (editingId === id) {
          resetForm()
        }
      } else {
        setError(data.error || 'Failed to delete blog')
      }
    } catch (err) {
      setError('Failed to delete blog: ' + err.message)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      title: '',
      slug: '',
      content: '',
      metaTitle: '',
      metaDescription: '',
      author: 'RahuNow',
      tags: '',
      featuredImage: '',
      status: 'draft',
    })
  }

  return (
    <div className="admin-blog-page">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <h1>Blog Admin</h1>
          <p>Manage your astrology blog posts</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="admin-message admin-error">
            {error}
          </div>
        )}
        {success && (
          <div className="admin-message admin-success">
            {success}
          </div>
        )}

        {/* Form */}
        <div className="admin-card">
          <h2>
            {editingId ? 'Edit Blog Post' : 'Create New Blog Post'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid admin-form-spacing">
              <div>
                <label className="admin-label">
                  Title * <span>(Main headline of your blog post)</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Understanding Rahu and Ketu in Vedic Astrology"
                  className="admin-input"
                />
              </div>

              <div>
                <label className="admin-label">
                  Slug (URL) <span>(Auto-generated from title, but editable)</span>
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="understanding-rahu-and-ketu-in-vedic-astrology"
                  className="admin-input"
                />
                <p className="admin-helper">Only lowercase letters, numbers, and hyphens. Must be unique.</p>
              </div>
            </div>

            <div className="admin-form-spacing">
              <label className="admin-label">
                Content (HTML) * <span>(Main body of your blog post)</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows={15}
                className="admin-textarea"
                placeholder='<h2>Introduction</h2>
<p>Your content here...</p>

<h2>Main Section</h2>
<p>More content...</p>

<h2>Conclusion</h2>
<p>Wrap up your article...</p>'
              />
              <p className="admin-helper">💡 Tip: Use AI tools (ChatGPT, Claude) to write content, then paste the HTML here. Use &lt;h2&gt; for main sections, &lt;h3&gt; for subsections, and &lt;p&gt; for paragraphs.</p>
            </div>

            <div className="admin-form-grid admin-form-spacing">
              <div>
                <label className="admin-label">
                  Meta Title (SEO) <span>(Optional - appears in search results)</span>
                </label>
                <input
                  type="text"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleInputChange}
                  placeholder="Keep it under 60 characters. If empty, main title will be used."
                  className="admin-input"
                />
                <p className="admin-helper">Example: "Rahu & Ketu Guide: Complete Vedic Astrology Explanation"</p>
              </div>

              <div>
                <label className="admin-label">
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  className="admin-input"
                />
              </div>
            </div>

            <div className="admin-form-spacing">
              <label className="admin-label">
                Meta Description (SEO) <span>(Optional - appears in search results)</span>
              </label>
              <textarea
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleInputChange}
                rows={3}
                placeholder="Write a compelling 150-160 character description. If empty, first 160 characters of content will be used."
                className="admin-textarea"
              />
              <p className="admin-helper">Example: "Learn about Rahu and Ketu in Vedic astrology. Discover their meanings, effects, and remedies for a balanced life."</p>
            </div>

            <div className="admin-form-grid admin-form-spacing">
              <div>
                <label className="admin-label">
                  Tags (comma-separated) <span>(Optional - for SEO and categorization)</span>
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="admin-input"
                  placeholder="vedic astrology, numerology, rahu, ketu, remedies"
                />
                <p className="admin-helper">Separate multiple tags with commas. Use 5-10 relevant keywords.</p>
              </div>

              <div>
                <label className="admin-label">
                  Featured Image URL <span>(Optional - appears in blog listing and social shares)</span>
                </label>
                <input
                  type="url"
                  name="featuredImage"
                  value={formData.featuredImage}
                  onChange={handleInputChange}
                  placeholder="https://rahunow.com/images/your-image.jpg"
                  className="admin-input"
                />
                <p className="admin-helper">Recommended: 1200x630 pixels. Upload to Firebase Storage or use a CDN.</p>
              </div>
            </div>

            <div className="admin-form-spacing">
              <label className="admin-label">
                Status <span>(Draft = not visible publicly, Published = live on website)</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="admin-select"
              >
                <option value="draft">Draft (Save but don't publish)</option>
                <option value="published">Published (Make it live)</option>
              </select>
              <p className="admin-helper">💡 Tip: Start with "Draft" to review, then change to "Published" when ready.</p>
            </div>

            <div className="admin-form-actions">
              <button
                type="submit"
                disabled={saving}
                className="admin-button"
              >
                {saving ? 'Saving...' : editingId ? 'Update Blog' : 'Create Blog'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="admin-button admin-button-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Blog List */}
        <div className="admin-card">
          <h2>All Blog Posts</h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontFamily: "'Inter', sans-serif", color: '#666' }}>
              Loading blogs...
            </div>
          ) : blogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontFamily: "'Inter', sans-serif", color: '#666' }}>
              No blog posts yet. Create your first one above!
            </div>
          ) : (
            <div>
              {blogs.map((blog) => (
                <div key={blog.id} className="admin-blog-item">
                  <div className="admin-blog-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h3>{blog.title}</h3>
                      <span className={`admin-status ${
                        blog.status === 'published' ? 'admin-status-published' : 'admin-status-draft'
                      }`}>
                        {blog.status}
                      </span>
                    </div>
                    <p className="admin-blog-meta">
                      Slug: /blog/{blog.slug} • {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : 'Not published'}
                    </p>
                  </div>
                  <div className="admin-actions">
                    <button
                      onClick={() => handleEdit(blog)}
                      className="admin-action-btn admin-action-btn-edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => router.push(`/blog/${blog.slug}`)}
                      className="admin-action-btn admin-action-btn-view"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(blog.id)}
                      className="admin-action-btn admin-action-btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
