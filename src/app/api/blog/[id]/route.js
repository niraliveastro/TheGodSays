/**
 * Blog API Routes for Individual Posts
 * Handles GET (single blog), PUT (update), and DELETE operations
 */

import { db } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { generateSlug } from '@/lib/blog-utils'

const BLOGS_COLLECTION = 'blogs'

// GET: Fetch a single blog by ID
export async function GET(request, { params }) {
  try {
    if (!db) {
      return Response.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    const { id } = await params
    const docRef = db.collection(BLOGS_COLLECTION).doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return Response.json({ error: 'Blog not found' }, { status: 404 })
    }

    const data = doc.data()
    const blog = {
      id: doc.id,
      ...data,
      publishedAt: data.publishedAt?.toDate?.()?.toISOString() || data.publishedAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    }

    return Response.json({ blog }, { status: 200 })
  } catch (error) {
    console.error('Error fetching blog:', error)
    return Response.json(
      { error: 'Failed to fetch blog', details: error.message },
      { status: 500 }
    )
  }
}

// PUT: Update an existing blog post
export async function PUT(request, { params }) {
  try {
    if (!db) {
      return Response.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const {
      title,
      slug,
      content,
      metaTitle,
      metaDescription,
      author,
      tags,
      featuredImage,
      status,
    } = body

    // Check if blog exists
    const docRef = db.collection(BLOGS_COLLECTION).doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return Response.json({ error: 'Blog not found' }, { status: 404 })
    }

    const existingData = doc.data()
    const updateData = {
      updatedAt: Timestamp.now(),
    }

    // Update fields if provided
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription
    if (author !== undefined) updateData.author = author
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : []
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage
    if (status !== undefined) {
      updateData.status = status === 'published' ? 'published' : 'draft'
      
      // If publishing for the first time, set publishedAt
      if (status === 'published' && !existingData.publishedAt) {
        updateData.publishedAt = Timestamp.now()
      }
    }

    // Handle slug change (check for conflicts)
    if (slug !== undefined && slug !== existingData.slug) {
      const finalSlug = slug || (title ? generateSlug(title) : existingData.slug)
      
      // Check if new slug already exists
      const slugCheck = await db
        .collection(BLOGS_COLLECTION)
        .where('slug', '==', finalSlug)
        .limit(1)
        .get()

      if (!slugCheck.empty && slugCheck.docs[0].id !== id) {
        return Response.json(
          { error: 'A blog with this slug already exists' },
          { status: 400 }
        )
      }

      updateData.slug = finalSlug
    }

    // Update the document
    await docRef.update(updateData)

    // Fetch updated document
    const updatedDoc = await docRef.get()
    const updatedData = updatedDoc.data()

    return Response.json(
      {
        success: true,
        blog: {
          id: updatedDoc.id,
          ...updatedData,
          publishedAt: updatedData.publishedAt?.toDate?.()?.toISOString() || updatedData.publishedAt,
          updatedAt: updatedData.updatedAt?.toDate?.()?.toISOString() || updatedData.updatedAt,
          createdAt: updatedData.createdAt?.toDate?.()?.toISOString() || updatedData.createdAt,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating blog:', error)
    return Response.json(
      { error: 'Failed to update blog', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE: Delete a blog post
export async function DELETE(request, { params }) {
  try {
    if (!db) {
      return Response.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      )
    }

    const { id } = await params
    const docRef = db.collection(BLOGS_COLLECTION).doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return Response.json({ error: 'Blog not found' }, { status: 404 })
    }

    await docRef.delete()

    // Return with no-cache headers to prevent caching
    return Response.json(
      { success: true, message: 'Blog deleted successfully' },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
        },
      }
    )
  } catch (error) {
    console.error('Error deleting blog:', error)
    return Response.json(
      { error: 'Failed to delete blog', details: error.message },
      { status: 500 }
    )
  }
}
