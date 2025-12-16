/**
 * Admin Dashboard Index Page
 * Redirects to blog admin or shows admin menu
 */

'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import './admin.css'

export default function AdminPage() {
  const router = useRouter()

  // Auto-redirect to blog admin for now
  useEffect(() => {
    router.push('/admin/blog')
  }, [router])

  return (
    <div className="admin-redirect-page">
      <div className="admin-redirect-content">
        <div className="admin-spinner"></div>
        <p className="admin-redirect-text">Redirecting to admin panel...</p>
      </div>
    </div>
  )
}
