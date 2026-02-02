import { getFirestore } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

// GET - Fetch all gallery items for an astrologer
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const astrologerId = searchParams.get('astrologerId');

    if (!astrologerId) {
      return NextResponse.json(
        { error: 'Astrologer ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const galleryRef = db
      .collection('astrologers')
      .doc(astrologerId)
      .collection('gallery');
    
    const snapshot = await galleryRef.orderBy('timestamp', 'desc').get();
    
    const galleryItems = [];
    snapshot.forEach((doc) => {
      galleryItems.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.().toISOString() || new Date().toISOString(),
      });
    });

    return NextResponse.json({ gallery: galleryItems }, { status: 200 });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery items', gallery: [] },
      { status: 500 }
    );
  }
}

// POST - Add a new gallery item
export async function POST(request) {
  try {
    const body = await request.json();
    const { astrologerId, mediaUrl, mediaType, title, description, thumbnailUrl } = body;

    if (!astrologerId || !mediaUrl || !mediaType) {
      return NextResponse.json(
        { error: 'Astrologer ID, media URL, and media type are required' },
        { status: 400 }
      );
    }

    // Validate media type
    if (!['image', 'video'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'Media type must be either "image" or "video"' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const galleryRef = db
      .collection('astrologers')
      .doc(astrologerId)
      .collection('gallery');

    const newItem = {
      mediaUrl,
      mediaType,
      title: title || '',
      description: description || '',
      thumbnailUrl: thumbnailUrl || mediaUrl,
      timestamp: new Date(),
    };

    const docRef = await galleryRef.add(newItem);

    return NextResponse.json(
      {
        message: 'Gallery item added successfully',
        id: docRef.id,
        ...newItem,
        timestamp: newItem.timestamp.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding gallery item:', error);
    return NextResponse.json(
      { error: 'Failed to add gallery item' },
      { status: 500 }
    );
  }
}

// PUT - Update a gallery item
export async function PUT(request) {
  try {
    const body = await request.json();
    const { astrologerId, itemId, title, description, mediaUrl, mediaType, thumbnailUrl } = body;

    if (!astrologerId || !itemId) {
      return NextResponse.json(
        { error: 'Astrologer ID and item ID are required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const itemRef = db
      .collection('astrologers')
      .doc(astrologerId)
      .collection('gallery')
      .doc(itemId);

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
    if (mediaType !== undefined) updateData.mediaType = mediaType;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    updateData.updatedAt = new Date();

    await itemRef.update(updateData);

    return NextResponse.json(
      { message: 'Gallery item updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating gallery item:', error);
    return NextResponse.json(
      { error: 'Failed to update gallery item' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a gallery item
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const astrologerId = searchParams.get('astrologerId');
    const itemId = searchParams.get('itemId');

    if (!astrologerId || !itemId) {
      return NextResponse.json(
        { error: 'Astrologer ID and item ID are required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const itemRef = db
      .collection('astrologers')
      .doc(astrologerId)
      .collection('gallery')
      .doc(itemId);

    await itemRef.delete();

    return NextResponse.json(
      { message: 'Gallery item deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    return NextResponse.json(
      { error: 'Failed to delete gallery item' },
      { status: 500 }
    );
  }
}
