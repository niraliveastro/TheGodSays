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

// Verify this is a legitimate cron request
function verifyCronRequest(request) {
  // Vercel Cron sends a special header
  const authHeader = request.headers.get('authorization')
  
  // Check for Vercel Cron secret (set in environment variables)
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
  
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true
  }
  
  // Also allow admin passcode for manual triggers
  const adminPasscode = process.env.ADMIN_PASSCODE
  if (adminPasscode && authHeader === `Bearer ${adminPasscode}`) {
    return true
  }
  
  // In development, allow localhost requests
  if (process.env.NODE_ENV === 'development') {
    const host = request.headers.get('host')
    if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
      return true
    }
  }
  
  return false
}

export async function GET(request) {
  try {
    // Verify request is from cron or admin
    if (!verifyCronRequest(request)) {
      return Response.json(
        { error: 'Unauthorized' },
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
    if (!verifyCronRequest(request)) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const maxBlogs = parseInt(body.max || '10')
    const dryRun = body.dryRun === true
    const filters = body.filters || {}

    console.log(`[Manual] Blog generation triggered - maxBlogs: ${maxBlogs}, dryRun: ${dryRun}`, filters)

    // Get configuration
    const config = getBlogGenerationConfig()
    const effectiveMaxBlogs = Math.min(maxBlogs, config.maxBlogsPerRun)

    // Generate blogs
    const result = await generateBlogs({
      maxBlogs: effectiveMaxBlogs,
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
