
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { conversationHistory, page, isContext, language } = await req.json();

    // Validate conversation history
    if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return NextResponse.json({ error: 'Conversation history is required' }, { status: 400 });
    }

    // Validate page
    if (!page) {
      return NextResponse.json({ error: 'Page is required' }, { status: 400 });
    }

    // Ensure we have at least a system message
    const hasSystemMessage = conversationHistory.some(msg => msg.role === 'system');
    if (!hasSystemMessage) {
      // Add default system message if missing - with language support
      const systemMessage = language === 'hi'
        ? `आप ${page} पृष्ठ के लिए एक सहायक हैं। कृपया सभी उत्तर हिंदी में दें।`
        : `You are a helpful assistant for the ${page} page.`;
      conversationHistory.unshift({
        role: 'system',
        content: systemMessage
      });
    } else if (language === 'hi') {
      // If system message exists but language is Hindi, append Hindi instruction
      const firstSystemMsg = conversationHistory.find(msg => msg.role === 'system');
      if (firstSystemMsg && !firstSystemMsg.content.includes('हिंदी')) {
        firstSystemMsg.content += '\n\nIMPORTANT: Please respond in Hindi (हिंदी में उत्तर दें). The user has selected Hindi as their preferred language.';
      }
    }

    // Prepare messages for OpenAI API
    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

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
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return NextResponse.json({ 
        error: 'Failed to get response from AI service',
        details: errorData 
      }, { status: response.status });
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      return NextResponse.json({ response: data.choices[0].message.content });
    } else {
      // Handle cases where there are no choices in the response
      return NextResponse.json({ response: "I don't have a response for that." });
    }

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error.message 
    }, { status: 500 });
  }
}
