/**
 * Blog API Routes
 * Handles GET (list all blogs) and POST (create new blog) operations
 */

import { db } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { generateSlug } from '@/lib/blog-utils'

const BLOGS_COLLECTION = 'blogs'

// GET: Fetch all blogs (including drafts for admin)
export async function GET(request) {
  try {
    if (!db) {
      return Response.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'published', 'draft', or null (all)

    let query = db.collection(BLOGS_COLLECTION)

    if (status) {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.orderBy('publishedAt', 'desc').get()

    const blogs = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      blogs.push({
        id: doc.id,
        ...data,
        publishedAt: data.publishedAt?.toDate?.()?.toISOString() || data.publishedAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      })
    })

    return Response.json({ blogs }, { status: 200 })
  } catch (error) {
    console.error('Error fetching blogs:', error)
    return Response.json(
      { error: 'Failed to fetch blogs', details: error.message },
      { status: 500 }
    )
  }
}

// POST: Create a new blog post
export async function POST(request) {
  try {
    if (!db) {
      return Response.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      title,
      slug,
      content,
      metaTitle,
      metaDescription,
      author = 'RahuNow',
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
