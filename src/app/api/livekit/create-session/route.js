import { AccessToken } from 'livekit-server-sdk'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { astrologerId, userId, callId, roomName: providedRoomName, voiceOnly = false, role, displayName } = await request.json()

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

    // Determine participant role and standardized identities/names
    // Prefer explicit role from client; fallback: if userId equals astrologerId or prefixed, infer via presence
    const normalizedRole = (role === 'astrologer' || role === 'user') ? role
      : (typeof userId === 'string' && userId.startsWith('astrologer-')) ? 'astrologer'
      : (typeof astrologerId === 'string' && astrologerId.startsWith('astrologer-')) ? 'astrologer'
      : 'user'

    const baseAstrologerId = String(astrologerId).replace(/^astrologer-/, '')
    const baseUserId = String(userId).replace(/^user-/, '')

    const participantIdentity = normalizedRole === 'astrologer'
      ? `astrologer-${baseAstrologerId}`
      : `user-${baseUserId}`

    const participantName = (displayName && typeof displayName === 'string' && displayName.trim().length > 0)
      ? displayName.trim()
      : (normalizedRole === 'astrologer' ? 'Astrologer' : 'User')

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

    // For voice-only calls, we'll handle video restrictions on the client side

    const jwt = await token.toJwt()

    return NextResponse.json({
      token: jwt,
      roomName,
      wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL,
      voiceOnly,
    })
  } catch (error) {
    console.error('Error creating LiveKit session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}