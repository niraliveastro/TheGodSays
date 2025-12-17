import { NextResponse } from 'next/server'
import { ConversationService } from '@/lib/conversations'
import { getAuthInstance } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/conversations
 * Get active conversation for user and chatType
 * Query params: userId, chatType
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const chatType = searchParams.get('chatType')

    if (!chatType || !['prediction', 'matchmaking'].includes(chatType)) {
      return NextResponse.json(
        { error: 'Invalid chatType. Must be "prediction" or "matchmaking"' },
        { status: 400 }
      )
    }

    if (!userId) {
      // Guest user - no conversation to return
      return NextResponse.json({ conversation: null })
    }

    const conversation = await ConversationService.getActiveConversation(userId, chatType)
    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error in GET /api/conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/conversations
 * Create or update conversation
 * Body: { userId, chatType, messages }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, chatType, messages } = body

    if (!chatType || !['prediction', 'matchmaking'].includes(chatType)) {
      return NextResponse.json(
        { error: 'Invalid chatType. Must be "prediction" or "matchmaking"' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages must be an array' },
        { status: 400 }
      )
    }

    // Get or create active conversation
    let conversation = await ConversationService.getActiveConversation(userId, chatType)
    
    if (conversation) {
      // Update existing conversation
      await ConversationService.updateConversation(conversation.id, messages)
      conversation = {
        ...conversation,
        messages
      }
    } else {
      // Create new conversation
      conversation = await ConversationService.createConversation(userId, chatType, messages)
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error in POST /api/conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/conversations/migrate
 * Migrate guest conversation to user account
 * Body: { userId, chatType, guestMessages }
 */
export async function PUT(request) {
  try {
    const body = await request.json()
    const { userId, chatType, guestMessages } = body

    if (!chatType || !['prediction', 'matchmaking'].includes(chatType)) {
      return NextResponse.json(
        { error: 'Invalid chatType. Must be "prediction" or "matchmaking"' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Convert guest messages format to conversation format if needed
    const formattedMessages = (guestMessages || []).map(msg => {
      // If already in correct format, use as-is
      if (msg.text !== undefined) {
        return msg;
      }
      // Convert from OpenAI format if needed
      if (msg.content !== undefined) {
        return {
          text: msg.content,
          isUser: msg.role === 'user',
          timestamp: new Date().toISOString()
        };
      }
      return msg;
    });

    const conversation = await ConversationService.migrateGuestConversation(
      userId,
      chatType,
      formattedMessages
    )

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error in PUT /api/conversations/migrate:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
