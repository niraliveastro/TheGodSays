import { AccessToken } from 'livekit-server-sdk'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { astrologerId, userId, callId, roomName: providedRoomName } = await request.json()

    // Validate required parameters
    if (!astrologerId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Validate parameter formats
    if (typeof astrologerId !== 'string' || astrologerId.length > 100) {
      return NextResponse.json({ error: 'Invalid astrologer ID' }, { status: 400 })
    }
    if (typeof userId !== 'string' || userId.length > 100) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }
    if (providedRoomName && (typeof providedRoomName !== 'string' || providedRoomName.length > 200)) {
      return NextResponse.json({ error: 'Invalid room name' }, { status: 400 })
    }

    // Validate environment variables
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    // Sanitize room name
    const roomName = providedRoomName || `astro-${astrologerId.slice(0, 20)}-${userId.slice(0, 20)}-${Date.now()}`

    // Determine participant role
    const isAstrologer = astrologerId.includes('astro') || astrologerId.includes('Astro')
    const participantIdentity = isAstrologer ? `astrologer-${Date.now()}` : `user-${Date.now()}`
    const participantName = isAstrologer ? `Astrologer` : `User`

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: participantIdentity,
        name: participantName,
      }
    )

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    })

    const jwt = await token.toJwt()

    return NextResponse.json({
      token: jwt,
      roomName,
      wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL,
    })
  } catch (error) {
    console.error('Error creating LiveKit session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}