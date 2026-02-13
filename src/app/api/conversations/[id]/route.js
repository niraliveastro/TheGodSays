import { NextResponse } from 'next/server'
import { ConversationService } from '@/lib/conversations'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/conversations/[id]
 * Get a single conversation by ID. Query: userId (must match conversation owner).
 */
export async function GET(request, { params }) {
  try {
    const { id: conversationId } = await params
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const conversation = await ConversationService.getConversationById(conversationId)
    if (!conversation) {
      return NextResponse.json({ conversation: null }, { status: 404 })
    }
    if (!userId || conversation.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error in GET /api/conversations/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
