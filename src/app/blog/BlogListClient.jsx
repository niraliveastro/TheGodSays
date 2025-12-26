/**
 * Client component for blog list updates
 * Handles real-time updates without affecting SEO
 * Hidden from crawlers but enhances user experience
 */

'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'

export default function BlogListClient({ initialBlogs }) {
  const [blogs, setBlogs] = useState(initialBlogs)
  const { toasts, removeToast } = useToast()

  useEffect(() => {
    // Only update if there are new blogs (silent background refresh)
    async function fetchBlogs() {
      try {
        const response = await fetch(`/api/blog?status=published&_t=${Date.now()}`, {
          cache: 'no-store',
        })
        const data = await response.json()
        if (response.ok && data.blogs) {
          // Only update if blog count changed (new blog published)
          if (data.blogs.length !== blogs.length) {
            setBlogs(data.blogs)
          }
        }
      } catch (error) {
        // Silent fail - don't disrupt user experience
        console.error('[Blog Page] Error fetching blogs:', error)
      }
    }

    // Refresh blogs every 60 seconds to catch new posts
    const interval = setInterval(fetchBlogs, 60000)
    return () => clearInterval(interval)
  }, [blogs.length])

  // This component doesn't render anything visible
  // It just handles background updates
  return <ToastContainer toasts={toasts} removeToast={removeToast} />
}

