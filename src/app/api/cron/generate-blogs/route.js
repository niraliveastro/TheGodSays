/**
 * Cron API Endpoint for Automated Blog Generation
 * 
 * This endpoint is called by Vercel Cron Jobs to automatically generate and publish blogs
 * 
 * Security: Protected by Vercel Cron secret
 * 
 * Usage:
 * - Configure in vercel.json cron jobs
 * - Runs automatically on schedule
 * - Can also be triggered manually via API call with proper auth
 */

import { generateBlogs } from '@/lib/blog-generator/blog-generator-service'
import { getBlogGenerationConfig } from '@/lib/blog-generator/config'
import { verifyAdminAuth } from '@/lib/admin-auth'

// Verify this is a legitimate cron request
async function verifyCronRequest(request) {
  // Vercel Cron sends a special header with CRON_SECRET
  const authHeader = request.headers.get('authorization')
  
  // Check for Vercel Cron secret (set in environment variables)
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
  
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    console.log('[Cron Auth] Verified via CRON_SECRET')
    return true
  }
  
  // Also allow admin passcode for manual triggers (use same auth as other admin endpoints)
  try {
    const { isAdmin, error } = await verifyAdminAuth(request)
    if (isAdmin) {
      console.log('[Cron Auth] Verified via ADMIN_PASSCODE')
      return true
    }
    console.log('[Cron Auth] Admin auth failed:', error)
  } catch (authError) {
    console.error('[Cron Auth] Error verifying admin auth:', authError)
  }
  
  // In development, allow localhost requests
  if (process.env.NODE_ENV === 'development') {
    const host = request.headers.get('host')
    if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
      console.log('[Cron Auth] Verified via development mode')
      return true
    }
  }
  
  console.log('[Cron Auth] All authentication methods failed')
  return false
}

export async function GET(request) {
  try {
    // Verify request is from cron or admin
    if (!(await verifyCronRequest(request))) {
      return Response.json(
        { error: 'Unauthorized', message: 'Invalid authentication. Please check your admin passcode or CRON_SECRET.' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const maxBlogs = parseInt(searchParams.get('max') || '10')
    const dryRun = searchParams.get('dryRun') === 'true'

    console.log(`[Cron] Blog generation triggered - maxBlogs: ${maxBlogs}, dryRun: ${dryRun}`)

    // Get configuration
    const config = getBlogGenerationConfig()
    const effectiveMaxBlogs = Math.min(maxBlogs, config.maxBlogsPerRun)

    // Generate blogs
    const result = await generateBlogs({
      maxBlogs: effectiveMaxBlogs,
      dryRun: dryRun,
    })

    return Response.json({
      success: result.success,
      message: result.message || 'Blog generation completed',
      generated: result.generated || 0,
      skipped: result.skipped || 0,
      errors: result.errors || [],
      blogs: result.blogs || [],
      dryRunWouldGenerate: result.dryRunWouldGenerate || [],
      timestamp: new Date().toISOString(),
    }, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    console.error('[Cron] Error in blog generation:', error)
    return Response.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request) {
  try {
    // Verify request is from admin
    if (!(await verifyCronRequest(request))) {
      return Response.json(
        { error: 'Unauthorized', message: 'Invalid authentication. Please check your admin passcode or CRON_SECRET.' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const maxBlogs = Math.min(parseInt(body.max || '10', 10) || 10, 100)
    const dryRun = body.dryRun === true
    const filters = body.filters || {}

    console.log(`[Manual] Blog generation triggered - maxBlogs: ${maxBlogs}, dryRun: ${dryRun}`, filters)

    // For manual admin runs, use the user's requested count directly (capped at 100)
    // Do not cap with config.maxBlogsPerRun - that is for cron runs

    // Generate blogs
    const result = await generateBlogs({
      maxBlogs,
      dryRun: dryRun,
      filters: filters,
    })

    return Response.json({
      success: result.success,
      message: result.message || 'Blog generation completed',
      generated: result.generated || 0,
      skipped: result.skipped || 0,
      errors: result.errors || [],
      blogs: result.blogs || [],
      dryRunWouldGenerate: result.dryRunWouldGenerate || [],
      timestamp: new Date().toISOString(),
    }, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    console.error('[Manual] Error in blog generation:', error)
    return Response.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
