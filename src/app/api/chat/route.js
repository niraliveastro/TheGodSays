import { NextResponse } from 'next/server'
import { WalletService } from '@/lib/wallet'
import { AIPricingService } from '@/lib/ai-pricing'
import { ConversationService } from '@/lib/conversations'
import { getAuthInstance } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed. Use POST.' }, { status: 405 })
}

/**
 * POST /api/chat
 * Enhanced chat API with credit deduction and conversation persistence
 * Body: {
 *   conversationHistory, page, isContext, language,
 *   userId (optional), chatType ('prediction' | 'matchmaking'),
 *   conversationId (optional)
 * }
 */
export async function POST(req) {
  try {
    const { 
      conversationHistory, 
      page, 
      isContext, 
      language,
      userId,
      chatType,
      conversationId
    } = await req.json()

    // Validate conversation history
    if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return NextResponse.json({ error: 'Conversation history is required' }, { status: 400 })
    }

    // Validate page
    if (!page) {
      return NextResponse.json({ error: 'Page is required' }, { status: 400 })
    }

    // Validate chatType if provided
    if (chatType && !['prediction', 'matchmaking'].includes(chatType)) {
      return NextResponse.json(
        { error: 'Invalid chatType. Must be "prediction" or "matchmaking"' },
        { status: 400 }
      )
    }

    // Get pricing
    const pricing = await AIPricingService.getPricing()
    const creditsRequired = pricing.creditsPerQuestion

    // For logged-in users, check wallet balance and deduct credits
    if (userId) {
      try {
        const wallet = await WalletService.getWallet(userId)
        const balance = wallet.balance || 0

        if (balance < creditsRequired) {
          return NextResponse.json(
            { 
              error: 'INSUFFICIENT_CREDITS',
              message: `Insufficient credits. Required: ${creditsRequired}, Available: ${balance}`,
              creditsRequired,
              availableCredits: balance
            },
            { status: 402 } // Payment Required
          )
        }
      } catch (walletError) {
        console.error('Error checking wallet:', walletError)
        // Continue with chat request even if wallet check fails (fallback)
      }
    }

    // Ensure we have at least a system message
    const hasSystemMessage = conversationHistory.some(msg => msg.role === 'system')
    if (!hasSystemMessage) {
      const systemMessage = language === 'hi'
        ? `आप ${page} पृष्ठ के लिए एक सहायक हैं। कृपया सभी उत्तर हिंदी में दें।`
        : `You are a helpful assistant for the ${page} page.`
      conversationHistory.unshift({
        role: 'system',
        content: systemMessage
      })
    } else if (language === 'hi') {
      const firstSystemMsg = conversationHistory.find(msg => msg.role === 'system')
      if (firstSystemMsg && !firstSystemMsg.content.includes('हिंदी')) {
        firstSystemMsg.content += '\n\nIMPORTANT: Please respond in Hindi (हिंदी में उत्तर दें). The user has selected Hindi as their preferred language.'
      }
    }

    // Prepare messages for OpenAI API
    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI API error:', response.status, errorData)
      return NextResponse.json({ 
        error: 'Failed to get response from AI service',
        details: errorData 
      }, { status: response.status })
    }

    const data = await response.json()
    const aiResponse = data.choices && data.choices.length > 0 
      ? data.choices[0].message.content 
      : "I don't have a response for that."

    // Deduct credits only after successful AI response (for logged-in users)
    if (userId && aiResponse) {
      try {
        await WalletService.debitWallet(userId, creditsRequired, {
          description: `AI chat question - ${chatType || page}`,
          metadata: {
            chatType: chatType || 'unknown',
            page,
            conversationId: conversationId || null
          }
        })
      } catch (debitError) {
        console.error('Error deducting credits:', debitError)
        // Log error but don't fail the request - credits will be deducted on retry
        // In production, consider adding retry logic or queue system
      }
    }

    // Update conversation in Firestore if userId and chatType are provided
    if (userId && chatType && conversationId) {
      try {
        const conversation = await ConversationService.getConversationById(conversationId)
        if (conversation) {
          // Extract the last user message and AI response to add to conversation
          const userMessages = conversationHistory.filter(msg => msg.role === 'user')
          const lastUserMessage = userMessages[userMessages.length - 1]
          
          if (lastUserMessage && aiResponse) {
            // Convert to conversation message format
            const newMessages = [
              ...(conversation.messages || []),
              {
                text: lastUserMessage.content,
                isUser: true,
                timestamp: new Date().toISOString()
              },
              {
                text: aiResponse,
                isUser: false,
                timestamp: new Date().toISOString()
              }
            ]
            
            await ConversationService.updateConversation(conversationId, newMessages)
          }
        }
      } catch (convError) {
        console.error('Error updating conversation:', convError)
        // Don't fail the request if conversation update fails
      }
    }

    return NextResponse.json({ 
      response: aiResponse,
      creditsDeducted: userId ? creditsRequired : 0,
      creditsRequired
    })

  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error.message 
    }, { status: 500 })
  }
}
