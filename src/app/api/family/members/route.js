import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });
    }

    // Return empty array if Firebase is not available
    if (!db) {
      return NextResponse.json({ success: true, members: [] });
    }

    const membersRef = db.collection('users').doc(userId).collection('familyMembers');
    const snapshot = await membersRef.orderBy('createdAt', 'desc').get();
    
    const members = [];
    snapshot.forEach(doc => {
      members.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('Error fetching family members:', error);
    return NextResponse.json({ success: true, members: [] });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, name, dob, time, place, relation } = body;

    if (!userId || !name || !dob || !time || !place || !relation) {
      return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ success: false, message: 'Database unavailable' }, { status: 503 });
    }

    const memberData = {
      name,
      dob,
      time,
      place,
      relation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const membersRef = db.collection('users').doc(userId).collection('familyMembers');
    const docRef = await membersRef.add(memberData);

    const member = {
      id: docRef.id,
      ...memberData
    };

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error('Error adding family member:', error);
    return NextResponse.json({ success: false, message: 'Failed to add family member' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const memberId = searchParams.get('memberId');

    if (!userId || !memberId) {
      return NextResponse.json({ success: false, message: 'User ID and Member ID required' }, { status: 400 });
    }

    await db.collection('users').doc(userId).collection('familyMembers').doc(memberId).delete();

    return NextResponse.json({ success: true, message: 'Family member deleted successfully' });
  } catch (error) {
    console.error('Error deleting family member:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete family member' }, { status: 500 });
  }
}