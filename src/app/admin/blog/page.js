/**
 * Blog Admin Page
 * Simple interface for managing blog posts (add, edit, publish)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateSlug } from '@/lib/blog-utils'

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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 mb-2">
            Blog Admin
          </h1>
          <p className="text-gray-400">Manage your astrology blog posts</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-700/50 rounded-lg text-green-300">
            {success}
          </div>
        )}

        {/* Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-6">
            {editingId ? 'Edit Blog Post' : 'Create New Blog Post'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title * <span className="text-xs text-gray-500">(Main headline of your blog post)</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Understanding Rahu and Ketu in Vedic Astrology"
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Slug (URL) <span className="text-xs text-gray-500">(Auto-generated from title, but editable)</span>
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="understanding-rahu-and-ketu-in-vedic-astrology"
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="mt-1 text-xs text-gray-500">Only lowercase letters, numbers, and hyphens. Must be unique.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Content (HTML) * <span className="text-xs text-gray-500">(Main body of your blog post)</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows={15}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                placeholder='<h2>Introduction</h2>
<p>Your content here...</p>

<h2>Main Section</h2>
<p>More content...</p>

<h2>Conclusion</h2>
<p>Wrap up your article...</p>'
              />
              <p className="mt-1 text-xs text-gray-500">💡 Tip: Use AI tools (ChatGPT, Claude) to write content, then paste the HTML here. Use &lt;h2&gt; for main sections, &lt;h3&gt; for subsections, and &lt;p&gt; for paragraphs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Meta Title (SEO) <span className="text-xs text-gray-500">(Optional - appears in search results)</span>
                </label>
                <input
                  type="text"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleInputChange}
                  placeholder="Keep it under 60 characters. If empty, main title will be used."
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="mt-1 text-xs text-gray-500">Example: "Rahu & Ketu Guide: Complete Vedic Astrology Explanation"</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Meta Description (SEO) <span className="text-xs text-gray-500">(Optional - appears in search results)</span>
              </label>
              <textarea
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleInputChange}
                rows={3}
                placeholder="Write a compelling 150-160 character description. If empty, first 160 characters of content will be used."
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="mt-1 text-xs text-gray-500">Example: "Learn about Rahu and Ketu in Vedic astrology. Discover their meanings, effects, and remedies for a balanced life."</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags (comma-separated) <span className="text-xs text-gray-500">(Optional - for SEO and categorization)</span>
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="vedic astrology, numerology, rahu, ketu, remedies"
                />
                <p className="mt-1 text-xs text-gray-500">Separate multiple tags with commas. Use 5-10 relevant keywords.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Featured Image URL <span className="text-xs text-gray-500">(Optional - appears in blog listing and social shares)</span>
                </label>
                <input
                  type="url"
                  name="featuredImage"
                  value={formData.featuredImage}
                  onChange={handleInputChange}
                  placeholder="https://rahunow.com/images/your-image.jpg"
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="mt-1 text-xs text-gray-500">Recommended: 1200x630 pixels. Upload to Firebase Storage or use a CDN.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status <span className="text-xs text-gray-500">(Draft = not visible publicly, Published = live on website)</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="draft">Draft (Save but don't publish)</option>
                <option value="published">Published (Make it live)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">💡 Tip: Start with "Draft" to review, then change to "Published" when ready.</p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : editingId ? 'Update Blog' : 'Create Blog'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Blog List */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h2 className="text-2xl font-semibold text-gray-100 mb-6">All Blog Posts</h2>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading blogs...</div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No blog posts yet. Create your first one above!</div>
          ) : (
            <div className="space-y-4">
              {blogs.map((blog) => (
                <div
                  key={blog.id}
                  className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-100">{blog.title}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          blog.status === 'published'
                            ? 'bg-green-900/30 text-green-300 border border-green-700/50'
                            : 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50'
                        }`}
                      >
                        {blog.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Slug: /blog/{blog.slug} • {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : 'Not published'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(blog)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => router.push(`/blog/${blog.slug}`)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      target="_blank"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(blog.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
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
