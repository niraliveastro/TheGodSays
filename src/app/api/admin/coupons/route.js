import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message)
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - Fetch all coupons
export async function GET(request) {
  try {
    const db = admin.firestore()
    const couponsRef = db.collection('coupons')
    const snapshot = await couponsRef.orderBy('createdAt', 'desc').get()

    const coupons = []
    snapshot.forEach(doc => {
      coupons.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString() || null,
      })
    })

    return NextResponse.json({ success: true, coupons })
  } catch (error) {
    console.error('Error fetching coupons:', error)
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 })
  }
}

// POST - Create a new coupon
export async function POST(request) {
  try {
    const body = await request.json()
    const { code, type, amount, maxUses, expiresAt, active = true, description } = body

    // Validation
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }

    const validTypes = ['once_per_user', 'multiple_per_user', 'one_time_global', 'limited_total', 'first_time_only']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ 
        error: `Invalid coupon type. Must be one of: ${validTypes.join(', ')}` 
      }, { status: 400 })
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    const db = admin.firestore()
    const couponCode = code.trim().toUpperCase()
    const couponRef = db.collection('coupons').doc(couponCode)

    // Check if coupon already exists
    const existingDoc = await couponRef.get()
    if (existingDoc.exists) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 })
    }

    // Prepare coupon data
    const couponData = {
      code: couponCode,
      type,
      amount: parseFloat(amount),
      active: Boolean(active),
      usedCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    if (description) {
      couponData.description = description
    }

    // Handle maxUses for limited_total type
    if (type === 'limited_total' && maxUses) {
      couponData.maxUses = parseInt(maxUses)
    }

    // Handle maxUsesPerUser for multiple_per_user type
    if (type === 'multiple_per_user' && maxUses) {
      couponData.maxUsesPerUser = parseInt(maxUses)
    }

    if (expiresAt) {
      couponData.expiresAt = admin.firestore.Timestamp.fromDate(new Date(expiresAt))
    }

    // Create coupon
    await couponRef.set(couponData)

    return NextResponse.json({
      success: true,
      coupon: {
        id: couponCode,
        ...couponData,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt || null,
      }
    })
  } catch (error) {
    console.error('Error creating coupon:', error)
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 })
  }
}

// PUT - Update a coupon
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, active, expiresAt, description, maxUses, amount, type, maxUsesPerUser } = body

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
    }

    const db = admin.firestore()
    const couponRef = db.collection('coupons').doc(id)
    const couponDoc = await couponRef.get()

    if (!couponDoc.exists) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    // Allow updating active status
    if (active !== undefined) {
      updateData.active = Boolean(active)
    }

    // Allow updating expiry date
    if (expiresAt !== undefined) {
      if (expiresAt && expiresAt !== '') {
        updateData.expiresAt = admin.firestore.Timestamp.fromDate(new Date(expiresAt))
      } else {
        // Remove expiry date if empty string or null
        updateData.expiresAt = admin.firestore.FieldValue.delete()
      }
    }

    // Allow updating description
    if (description !== undefined) {
      if (description === '' || description === null) {
        updateData.description = admin.firestore.FieldValue.delete()
      } else {
        updateData.description = description
      }
    }

    // Allow updating amount
    if (amount !== undefined && amount > 0) {
      updateData.amount = parseFloat(amount)
    }

    // Allow updating type (but validate it)
    if (type !== undefined && type !== '') {
      const validTypes = ['once_per_user', 'multiple_per_user', 'one_time_global', 'limited_total', 'first_time_only']
      if (validTypes.includes(type)) {
        const currentType = couponDoc.data().type
        updateData.type = type
        // Clear maxUses/maxUsesPerUser if type changes to avoid confusion
        if (currentType !== type) {
          if (currentType === 'limited_total') {
            updateData.maxUses = admin.firestore.FieldValue.delete()
          } else if (currentType === 'multiple_per_user') {
            updateData.maxUsesPerUser = admin.firestore.FieldValue.delete()
          }
        }
      }
    }

    // Handle maxUses based on type
    const couponType = type || couponDoc.data().type
    if (maxUses !== undefined && maxUses !== '' && maxUses !== null) {
      const maxUsesValue = parseInt(maxUses)
      if (!isNaN(maxUsesValue)) {
        if (couponType === 'limited_total') {
          updateData.maxUses = maxUsesValue
        } else if (couponType === 'multiple_per_user') {
          updateData.maxUsesPerUser = maxUsesValue
        }
      }
    } else if (maxUses === '' || maxUses === null) {
      // Clear maxUses if empty string or null is sent
      if (couponType === 'limited_total') {
        updateData.maxUses = admin.firestore.FieldValue.delete()
      } else if (couponType === 'multiple_per_user') {
        updateData.maxUsesPerUser = admin.firestore.FieldValue.delete()
      }
    }

    // Handle maxUsesPerUser directly (if sent separately)
    if (maxUsesPerUser !== undefined && maxUsesPerUser !== '' && maxUsesPerUser !== null) {
      const maxUsesPerUserValue = parseInt(maxUsesPerUser)
      if (!isNaN(maxUsesPerUserValue)) {
        updateData.maxUsesPerUser = maxUsesPerUserValue
      }
    } else if (maxUsesPerUser === '' || maxUsesPerUser === null) {
      updateData.maxUsesPerUser = admin.firestore.FieldValue.delete()
    }

    await couponRef.update(updateData)

    const updatedDoc = await couponRef.get()
    const updatedData = updatedDoc.data()

    return NextResponse.json({
      success: true,
      coupon: {
        id: updatedDoc.id,
        ...updatedData,
        createdAt: updatedData.createdAt?.toDate?.()?.toISOString() || null,
        expiresAt: updatedData.expiresAt?.toDate?.()?.toISOString() || null,
      }
    })
  } catch (error) {
    console.error('Error updating coupon:', error)
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 })
  }
}

// DELETE - Delete a coupon
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
    }

    const db = admin.firestore()
    const couponRef = db.collection('coupons').doc(id)
    const couponDoc = await couponRef.get()

    if (!couponDoc.exists) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    await couponRef.delete()

    return NextResponse.json({ success: true, message: 'Coupon deleted successfully' })
  } catch (error) {
    console.error('Error deleting coupon:', error)
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 })
  }
}

