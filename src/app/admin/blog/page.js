/**
 * Blog Admin Page
 * Simple interface for managing blog posts (add, edit, publish)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateSlug } from '@/lib/blog-utils'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import './admin-blog.css'

const ADMIN_PASSCODE = 'Spacenos.nxt@global'
const PASSCODE_STORAGE_KEY = 'admin_passcode_verified'

export default function BlogAdminPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast()
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingContentImage, setUploadingContentImage] = useState(false)
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(false)
  const [showPasscodeModal, setShowPasscodeModal] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState('')
  const [publishedBlogs, setPublishedBlogs] = useState([])
  const [draftBlogs, setDraftBlogs] = useState([])
  const [loadingPublished, setLoadingPublished] = useState(false)
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [activeTab, setActiveTab] = useState('published') // 'published' or 'drafts'

  // Form state
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    metaTitle: '',
    metaDescription: '',
    author: 'NiraLive Astro',
    tags: '',
    featuredImage: '',
    status: 'draft',
  })

  // Check if passcode is already verified in session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const verified = sessionStorage.getItem(PASSCODE_STORAGE_KEY)
      if (verified === 'true') {
        setIsPasscodeVerified(true)
      } else {
        setShowPasscodeModal(true)
      }
    }
  }, [])

  // Fetch blogs only after authentication
  useEffect(() => {
    if (isPasscodeVerified) {
      fetchAllBlogs()
    }
  }, [isPasscodeVerified])

  const handlePasscodeSubmit = (e) => {
    e.preventDefault()
    setPasscodeError('')
    
    if (passcodeInput === ADMIN_PASSCODE) {
      setIsPasscodeVerified(true)
      setShowPasscodeModal(false)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(PASSCODE_STORAGE_KEY, 'true')
      }
      setPasscodeInput('')
    } else {
      setPasscodeError('Incorrect passcode. Please try again.')
      setPasscodeInput('')
    }
  }

  // Handle edit query parameter from URL
  useEffect(() => {
    if ((publishedBlogs.length === 0 && draftBlogs.length === 0) || editingId) return
    
    const params = new URLSearchParams(window.location.search)
    const editId = params.get('edit')
    if (editId) {
      // Search in both published and draft blogs
      const allBlogs = [...publishedBlogs, ...draftBlogs]
      const blogToEdit = allBlogs.find(b => b.id === editId)
      if (blogToEdit) {
        setEditingId(blogToEdit.id)
        setFormData({
          title: blogToEdit.title || '',
          slug: blogToEdit.slug || '',
          content: blogToEdit.content || '',
          metaTitle: blogToEdit.metaTitle || blogToEdit.title || '',
          metaDescription: blogToEdit.metaDescription || '',
          author: blogToEdit.author || 'NiraLive Astro',
          tags: blogToEdit.tags?.join(', ') || '',
          featuredImage: blogToEdit.featuredImage || '',
          status: blogToEdit.status || 'draft',
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
        // Clean up URL
        window.history.replaceState({}, '', '/admin/blog')
      }
    }
  }, [publishedBlogs, draftBlogs, editingId])

  const fetchAllBlogs = async () => {
    // Fetch published blogs
    setLoadingPublished(true)
    try {
      const publishedResponse = await fetch('/api/blog?status=published', {
        headers: {
          'Authorization': `Bearer ${ADMIN_PASSCODE}`,
        },
      })
      const publishedData = await publishedResponse.json()
      if (publishedResponse.ok) {
        setPublishedBlogs(publishedData.blogs || [])
      }
    } catch (err) {
      console.error('Error fetching published blogs:', err)
    } finally {
      setLoadingPublished(false)
    }

    // Fetch draft blogs
    setLoadingDrafts(true)
    try {
      const draftsResponse = await fetch('/api/blog?status=draft', {
        headers: {
          'Authorization': `Bearer ${ADMIN_PASSCODE}`,
        },
      })
      const draftsData = await draftsResponse.json()
      if (draftsResponse.ok) {
        setDraftBlogs(draftsData.blogs || [])
      }
    } catch (err) {
      console.error('Error fetching draft blogs:', err)
    } finally {
      setLoadingDrafts(false)
    }
  }

  // Legacy function for compatibility
  const fetchBlogs = async (status = null) => {
    await fetchAllBlogs()
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
        adminPasscode: ADMIN_PASSCODE, // Include passcode for server-side verification
      }

      let response
      if (editingId) {
        // Update existing blog
        response = await fetch(`/api/blog/${editingId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_PASSCODE}`, // Also send in header
          },
          body: JSON.stringify(payload),
        })
      } else {
        // Create new blog
        response = await fetch('/api/blog', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_PASSCODE}`, // Also send in header
          },
          body: JSON.stringify(payload),
        })
      }

      const data = await response.json()

      if (response.ok) {
        const message = editingId ? 'Blog updated successfully!' : 'Blog created successfully!'
        setSuccess(message)
        showSuccess(message)
        resetForm()
        fetchBlogs()
        
        // If published, show link to view
        if (formData.status === 'published' && data.blog?.slug) {
          setTimeout(() => {
            window.open(`/blog/${data.blog.slug}`, '_blank')
          }, 1000)
        }
        // Refresh all blogs
        fetchAllBlogs()
      } else {
        const errorMsg = data.error || 'Failed to save blog'
        setError(errorMsg)
        showError(errorMsg)
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
      author: blog.author || 'NiraLive Astro',
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
        headers: {
          'Authorization': `Bearer ${ADMIN_PASSCODE}`, // Send passcode in header
        },
      })

      const data = await response.json()

      if (response.ok) {
        const message = 'Blog deleted successfully!'
        setSuccess(message)
        showSuccess(message)
        fetchAllBlogs()
        if (editingId === id) {
          resetForm()
        }
      } else {
        const errorMsg = data.error || 'Failed to delete blog'
        setError(errorMsg)
        showError(errorMsg)
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
      author: 'NiraLive Astro',
      tags: '',
      featuredImage: '',
      status: 'draft',
    })
  }

  // Show passcode modal if not authenticated
  if (!isPasscodeVerified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Admin Access</h1>
          <p className="text-sm text-gray-500 text-center mb-8">Enter passcode to access blog management</p>
          
          {passcodeError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{passcodeError}</p>
            </div>
          )}

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div>
              <label htmlFor="passcode" className="block text-sm font-medium text-gray-700 mb-2">
                Passcode
              </label>
              <input
                type="password"
                id="passcode"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter admin passcode"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Verify
            </button>
          </form>
        </div>
      </div>
    )
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

<img src="https://example.com/image.jpg" alt="Description of image" />

<h2>Main Section</h2>
<p>More content with <strong>bold text</strong> and <em>italic text</em>.</p>

<h2>Conclusion</h2>
<p>Wrap up your article...</p>'
              />
              <div className="admin-helper">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0 }}><strong>💡 Tips for Adding Content:</strong></p>
                  <label
                    style={{
                      padding: '0.5rem 1rem',
                      background: uploadingContentImage ? '#e5e7eb' : 'linear-gradient(135deg, #d4af37, #b8972e)',
                      color: uploadingContentImage ? '#9ca3af' : 'white',
                      borderRadius: '0.375rem',
                      cursor: uploadingContentImage ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      border: 'none',
                    }}
                  >
                    {uploadingContentImage ? 'Uploading...' : '📷 Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return

                        if (!file.type.startsWith('image/')) {
                          showError('Please select an image file')
                          return
                        }

                        if (file.size > 5 * 1024 * 1024) {
                          showError('Image size must be less than 5MB')
                          return
                        }

                        setUploadingContentImage(true)
                        try {
                          const uploadFormData = new FormData()
                          uploadFormData.append('file', file)
                          uploadFormData.append('type', 'blog')

                          const response = await fetch('/api/blog/upload-image', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${ADMIN_PASSCODE}`, // Send passcode in header
                            },
                            body: uploadFormData,
                          })

                          const data = await response.json()

                          if (response.ok && data.url) {
                            // Insert image tag at cursor position or at the end
                            const textarea = e.target.closest('form').querySelector('textarea[name="content"]')
                            const cursorPos = textarea.selectionStart || formData.content.length
                            const textBefore = formData.content.substring(0, cursorPos)
                            const textAfter = formData.content.substring(cursorPos)
                            
                            const imageTag = `\n<img src="${data.url}" alt="${file.name.replace(/\.[^/.]+$/, '')}" />\n`
                            const newContent = textBefore + imageTag + textAfter
                            
                            setFormData((prev) => ({
                              ...prev,
                              content: newContent,
                            }))
                            
                            // Set cursor position after inserted image
                            setTimeout(() => {
                              textarea.focus()
                              const newCursorPos = cursorPos + imageTag.length
                              textarea.setSelectionRange(newCursorPos, newCursorPos)
                            }, 0)
                            
                            showSuccess('Image uploaded and inserted!')
                          } else {
                            const errorMsg = data.error || 'Failed to upload image'
                            const suggestion = data.suggestion || ''
                            showError(errorMsg + (suggestion ? ` ${suggestion}` : ''))
                          }
                        } catch (err) {
                          showError('Failed to upload image: ' + err.message)
                        } finally {
                          setUploadingContentImage(false)
                          e.target.value = '' // Reset input
                        }
                      }}
                      disabled={uploadingContentImage}
                    />
                  </label>
                </div>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                  <li>Use AI tools (ChatGPT, Claude) to write content, then paste the HTML here</li>
                  <li>Use <code>&lt;h2&gt;</code> for main sections, <code>&lt;h3&gt;</code> for subsections, <code>&lt;p&gt;</code> for paragraphs</li>
                  <li><strong>To add images:</strong> Click "📷 Upload Image" button above (requires Firebase Storage enabled) or use <code>&lt;img src="URL" alt="description" /&gt;</code></li>
                  <li>Uploaded images are automatically inserted into your content at the cursor position</li>
                  <li>Image URLs can be from: Unsplash, Imgur, your own CDN, or Firebase Storage (when enabled)</li>
                  <li><strong>Note:</strong> Image upload requires Firebase Storage to be enabled (Blaze plan). Until then, use external image URLs.</li>
                  <li>Images will automatically be styled with rounded corners and proper spacing</li>
                </ul>
              </div>
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
                  Featured Image <span>(Optional - appears in blog listing and social shares)</span>
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <input
                    type="url"
                    name="featuredImage"
                    value={formData.featuredImage}
                    onChange={handleInputChange}
                    placeholder="https://niraliveastro.com/images/your-image.jpg"
                    className="admin-input"
                    style={{ flex: 1 }}
                  />
                  <label
                    style={{
                      padding: '0.625rem 1.25rem',
                      background: uploadingImage ? '#e5e7eb' : 'linear-gradient(135deg, #d4af37, #b8972e)',
                      color: uploadingImage ? '#9ca3af' : 'white',
                      borderRadius: '0.5rem',
                      cursor: uploadingImage ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      border: 'none',
                    }}
                  >
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return

                        if (!file.type.startsWith('image/')) {
                          showError('Please select an image file')
                          return
                        }

                        if (file.size > 5 * 1024 * 1024) {
                          showError('Image size must be less than 5MB')
                          return
                        }

                        setUploadingImage(true)
                        try {
                          const uploadFormData = new FormData()
                          uploadFormData.append('file', file)
                          uploadFormData.append('type', 'blog')

                          const response = await fetch('/api/blog/upload-image', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${ADMIN_PASSCODE}`, // Send passcode in header
                            },
                            body: uploadFormData,
                          })

                          const data = await response.json()

                          if (response.ok && data.url) {
                            setFormData((prev) => ({
                              ...prev,
                              featuredImage: data.url,
                            }))
                            showSuccess('Image uploaded successfully!')
                          } else {
                            const errorMsg = data.error || 'Failed to upload image'
                            const suggestion = data.suggestion || ''
                            showError(errorMsg + (suggestion ? ` ${suggestion}` : ''))
                          }
                        } catch (err) {
                          showError('Failed to upload image: ' + err.message)
                        } finally {
                          setUploadingImage(false)
                          e.target.value = '' // Reset input
                        }
                      }}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
                {formData.featuredImage && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <img
                      src={formData.featuredImage}
                      alt="Featured preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <p className="admin-helper">Recommended: 1200x630 pixels. Upload from device (requires Firebase Storage enabled) or paste a URL from external sources (Unsplash, Imgur, etc.).</p>
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

        {/* Blog Management */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Blog Management</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('published')}
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  background: activeTab === 'published' ? '#d4af37' : 'white',
                  color: activeTab === 'published' ? 'white' : '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Published ({publishedBlogs.length})
              </button>
              <button
                onClick={() => setActiveTab('drafts')}
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  background: activeTab === 'drafts' ? '#d4af37' : 'white',
                  color: activeTab === 'drafts' ? 'white' : '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Drafts ({draftBlogs.length})
              </button>
            </div>
          </div>

          {/* Show Published Blogs */}
          {activeTab === 'published' && (
            <>
              {loadingPublished ? (
                <div style={{ textAlign: 'center', padding: '3rem', fontFamily: "'Inter', sans-serif", color: '#666' }}>
                  Loading published blogs...
                </div>
              ) : publishedBlogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', fontFamily: "'Inter', sans-serif", color: '#666' }}>
                  No published posts yet. Publish your first one above!
                </div>
              ) : (
                <div>
                  {publishedBlogs.map((blog) => (
                    <div key={blog.id} className="admin-blog-item">
                      <div className="admin-blog-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <h3>{blog.title}</h3>
                          <span className="admin-status admin-status-published">
                            Published
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
            </>
          )}

          {/* Show Draft Blogs */}
          {activeTab === 'drafts' && (
            <>
              {loadingDrafts ? (
                <div style={{ textAlign: 'center', padding: '3rem', fontFamily: "'Inter', sans-serif", color: '#666' }}>
                  Loading draft blogs...
                </div>
              ) : draftBlogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', fontFamily: "'Inter', sans-serif", color: '#666' }}>
                  No draft posts yet. Create a draft above!
                </div>
              ) : (
                <div>
                  {draftBlogs.map((blog) => (
                    <div key={blog.id} className="admin-blog-item">
                      <div className="admin-blog-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <h3>{blog.title}</h3>
                          <span className="admin-status admin-status-draft">
                            Draft
                          </span>
                        </div>
                        <p className="admin-blog-meta">
                          Slug: /blog/{blog.slug} • {blog.updatedAt ? new Date(blog.updatedAt).toLocaleDateString() : 'Not saved'}
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
            </>
          )}
        </div>
      </div>
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
