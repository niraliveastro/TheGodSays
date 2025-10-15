import { AccessToken } from 'livekit-server-sdk'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { astrologerId, userId, callId, roomName } = await request.json()

    if (!astrologerId || !userId || !roomName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Use the room name from the call data
    const finalRoomName = roomName

    // Determine participant role and create appropriate identity
    const isAstrologer = astrologerId === 'astrologer' || astrologerId.includes('astro')
    const participantIdentity = isAstrologer ? `astrologer-${roomName}` : `user-${roomName}`
    const participantName = isAstrologer ? `Astrologer-${roomName.slice(-6)}` : `User-${userId.slice(-6)}`

    // Create access token
    // Use a server-only LiveKit API key (do NOT expose this as NEXT_PUBLIC_...)
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
