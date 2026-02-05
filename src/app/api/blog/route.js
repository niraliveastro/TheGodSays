/**
 * Blog API Routes
 * Handles GET (list all blogs) and POST (create new blog) operations
 */

import { getFirestore } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { generateSlug } from '@/lib/blog-utils'
import { verifyAdminAuth, requireAdminAuth } from '@/lib/admin-auth'

const BLOGS_COLLECTION = 'blogs'

// GET: Fetch all blogs (including drafts for admin)
export async function GET(request) {
  try {
    const db = getFirestore()
    if (!db || typeof db.collection !== 'function') {
      return Response.json(
        { error: 'Firebase Admin not initialized. Please check environment variables: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, NEXT_PUBLIC_FIREBASE_PROJECT_ID' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status') // 'published', 'draft', or null (all)
    
    // Check if user is admin
    const { isAdmin } = await verifyAdminAuth(request)
    console.log(`[Blog API] Admin check: isAdmin=${isAdmin}, statusParam=${statusParam}`)
    
    // If not admin, only show published blogs (ignore status param for non-admins)
    const status = isAdmin ? statusParam : (statusParam === 'published' ? 'published' : 'published')
    console.log(`[Blog API] Final status filter: ${status}`)

    let query = db.collection(BLOGS_COLLECTION)

    // Always filter by status - default to 'published' for public users
    if (status) {
      query = query.where('status', '==', status)
    } else if (!isAdmin) {
      // For non-admin users, default to published only
      query = query.where('status', '==', 'published')
    }

    // Try with orderBy first, fallback to without orderBy if index not ready
    let snapshot
    try {
      // For published blogs, order by publishedAt; for drafts, order by updatedAt or createdAt
      if (status === 'published') {
        snapshot = await query.orderBy('publishedAt', 'desc').get()
      } else if (status === 'draft') {
        // Try updatedAt first, fallback to createdAt if updatedAt doesn't exist
        try {
          snapshot = await query.orderBy('updatedAt', 'desc').get()
        } catch (updatedAtError) {
          // If updatedAt index doesn't exist, try createdAt
          try {
            snapshot = await query.orderBy('createdAt', 'desc').get()
          } catch (createdAtError) {
            // If neither works, query without orderBy
            console.log('[Blog API] Cannot order drafts by updatedAt or createdAt, querying without orderBy')
            snapshot = await query.get()
          }
        }
      } else {
        // For all blogs (admin only), try publishedAt first, fallback to updatedAt
        snapshot = await query.orderBy('publishedAt', 'desc').get()
      }
    } catch (indexError) {
      // If composite index not ready, query without orderBy and sort in memory
      console.log('[Blog API] Index not ready, querying without orderBy:', indexError.message)
      console.log('[Blog API] This is normal if the Firestore index is still building')
      snapshot = await query.get()
    }

    const blogs = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      
      // For published blogs, ensure publishedAt exists
      if (status === 'published' && !data.publishedAt) {
        console.log(`[Blog API] Skipping blog ${doc.id} - status is published but publishedAt is missing`)
        return // Skip blogs without publishedAt when filtering for published
      }
      
      blogs.push({
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate?.()?.toISOString() || data.publishedAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      })
    })

    // If we couldn't use orderBy, sort in memory
    if (blogs.length > 0) {
      blogs.sort((a, b) => {
        // For published blogs, use publishedAt; for drafts, use updatedAt or createdAt
        const dateA = status === 'published' 
          ? (a.publishedAt ? new Date(a.publishedAt).getTime() : 0)
          : (a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0))
        const dateB = status === 'published'
          ? (b.publishedAt ? new Date(b.publishedAt).getTime() : 0)
          : (b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0))
        return dateB - dateA // Descending order
      })
    }
    
    console.log(`[Blog API] Returning ${blogs.length} ${status || 'all'} blog(s)`)

    return Response.json({ blogs }, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    })
  } catch (error) {
    console.error('Error fetching blogs:', error)
    return Response.json(
      { error: 'Failed to fetch blogs', details: error.message },
      { status: 500 }
    )
  }
}

// POST: Create a new blog post (Admin only)
export async function POST(request) {
  try {
    // Verify admin authentication
    const body = await request.json()
    const authError = await requireAdminAuth(request, body)
    if (authError) {
      return authError
    }

    const db = getFirestore()
    if (!db || typeof db.collection !== 'function') {
      return Response.json(
        { error: 'Firebase Admin not initialized. Please check environment variables: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, NEXT_PUBLIC_FIREBASE_PROJECT_ID' },
        { status: 500 }
      )
    }
    const {
      title,
      slug,
      content,
      metaTitle,
      metaDescription,
      author = 'NiraLive Astro',
      tags = [],
      featuredImage,
      status = 'draft',
    } = body

    // Validation
    if (!title || !content) {
      return Response.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Generate slug if not provided
    const finalSlug = slug || generateSlug(title)

    // Check if slug already exists
    const existingBlog = await db
      .collection(BLOGS_COLLECTION)
      .where('slug', '==', finalSlug)
      .limit(1)
      .get()

    if (!existingBlog.empty) {
      return Response.json(
        { error: 'A blog with this slug already exists' },
        { status: 400 }
      )
    }

    // Prepare blog data
    const now = Timestamp.now()
    const blogData = {
      title,
      slug: finalSlug,
      content,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || content.substring(0, 160).replace(/<[^>]*>/g, ''),
      author,
      tags: Array.isArray(tags) ? tags : [],
      featuredImage: featuredImage || null,
      status: status === 'published' ? 'published' : 'draft',
      publishedAt: status === 'published' ? now : null,
      updatedAt: now,
      createdAt: now,
    }

    // Add to Firestore
    const docRef = await db.collection(BLOGS_COLLECTION).add(blogData)

    return Response.json(
      {
        success: true,
        id: docRef.id,
        blog: {
          id: docRef.id,
          ...blogData,
          publishedAt: blogData.publishedAt?.toDate?.()?.toISOString() || null,
          updatedAt: blogData.updatedAt?.toDate?.()?.toISOString() || null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating blog:', error)
    return Response.json(
      { error: 'Failed to create blog', details: error.message },
      { status: 500 }
    )
  }
}
