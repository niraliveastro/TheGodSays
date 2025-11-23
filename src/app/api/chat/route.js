
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { prompt, page } = await req.json();

    // Simple validation
    if (!prompt || !page) {
      return NextResponse.json({ error: 'Prompt and page are required' }, { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: `You are a helpful assistant for the ${page} page.` },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      return NextResponse.json({ response: data.choices[0].message.content });
    } else {
      // Handle cases where there are no choices in the response
      return NextResponse.json({ response: "I don't have a response for that." });
    }

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
