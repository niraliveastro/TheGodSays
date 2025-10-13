// import { AccessToken } from 'livekit-server-sdk'
// import { NextResponse } from 'next/server'

// export async function POST(request) {
//   try {
//     const { astrologerId, userId, callId, roomName: providedRoomName } = await request.json()

//     if (!astrologerId || !userId) {
//       return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
//     }

//     // Use provided room name or create a new one
//     const roomName = providedRoomName || `astro-${astrologerId}-${userId}-${Date.now()}`

//     // Determine participant role and create appropriate identity
//     const isAstrologer = astrologerId === 'astrologer' || astrologerId.includes('astro')
//     const participantIdentity = isAstrologer ? `astrologer-${roomName}` : `user-${roomName}`
//     const participantName = isAstrologer ? `Astrologer-${roomName.slice(-6)}` : `User-${userId.slice(-6)}`

//     // Create access token
//     const token = new AccessToken(
//       process.env.NEXT_PUBLIC_LIVEKIT_API_KEY,
//       process.env.LIVEKIT_API_SECRET,
//       {
//         identity: participantIdentity,
//         name: participantName,
//       }
//     )

//     token.addGrant({
//       room: roomName,
//       roomJoin: true,
//       canPublish: true,
//       canSubscribe: true,
//       canPublishData: true,
//       canUpdateOwnMetadata: true,
//     })

//     const jwt = await token.toJwt()

//     return NextResponse.json({
//       token: jwt,
//       roomName,
//       wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL,
//     })
//   } catch (error) {
//     console.error('Error creating LiveKit session:', error)
//     return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
//   }
// }

































import { AccessToken } from 'livekit-server-sdk'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // Validate required environment variables first
    const apiKey = process.env.NEXT_PUBLIC_LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('Missing LiveKit environment variables:', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasWsUrl: !!wsUrl
      })
      return NextResponse.json({
        error: 'LiveKit configuration error',
        details: 'Server is missing required LiveKit credentials. Please contact support.'
      }, { status: 500 })
    }

    const { astrologerId, userId, callId, roomName: providedRoomName } = await request.json()

    if (!astrologerId || !userId) {
      return NextResponse.json({
        error: 'Missing required parameters',
        details: 'astrologerId and userId are required'
      }, { status: 400 })
    }

    // Use provided room name or create a new one
    const roomName = providedRoomName || `astro-${astrologerId}-${userId}-${Date.now()}`

    // Determine participant role and create appropriate identity
    const isAstrologer = astrologerId === 'astrologer' || astrologerId.includes('astro')
    const participantIdentity = isAstrologer ? `astrologer-${roomName}` : `user-${roomName}`
    const participantName = isAstrologer ? `Astrologer-${roomName.slice(-6)}` : `User-${userId.slice(-6)}`

    console.log('Creating LiveKit token for:', {
      roomName,
      participantIdentity,
      participantName,
      isAstrologer
    })

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
    })

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    })

    const jwt = await token.toJwt()

    console.log('LiveKit token created successfully for room:', roomName)

    return NextResponse.json({
      token: jwt,
      roomName,
      wsUrl,
    })
  } catch (error) {
    console.error('Error creating LiveKit session:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json({
      error: 'Failed to create session',
      details: error.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}
