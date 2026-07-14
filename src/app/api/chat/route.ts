import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting Check (Max 15 RPM)
    const limitResult = rateLimit(request, 15);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: { 
            'Retry-After': Math.ceil((limitResult.reset - Date.now()) / 1000).toString() 
          } 
        }
      );
    }

    const body = await request.json();
    let { message, history = [], language = 'en', accessibilityMode = false } = body;

    // 2. Input Sanitization & Validation
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required and must be a string.' }, { status: 400 });
    }

    message = message.trim();
    if (message.length > 1000) {
      message = message.substring(0, 1000);
    }
    // Strip HTML tags to prevent prompt XSS rendering or parser exploitation
    message = message.replace(/<\/?[^>]+(>|$)/g, '');

    if (!message) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server.' },
        { status: 500 }
      );
    }

    // Load venue data
    const venuePath = path.join(process.cwd(), 'src', 'data', 'venue.json');
    const venueDataRaw = await fs.readFile(venuePath, 'utf8');
    const venueData = JSON.parse(venueDataRaw);

    // Build system instructions with RAG context
    const systemInstruction = `
You are the PITCH AI Wayfinding & Accessibility Concierge at the ${venueData.stadiumName} (80,000 capacity World Cup venue).
Your goal is to guide fans, volunteers, and staff to their destinations (seats, restrooms, food, transit) safely and quickly.

STADIUM VENUE DATABASE (CONTEXT):
${JSON.stringify(venueData, null, 2)}

OPERATIONAL RULES:
1. Ground every answer strictly in the venue data. Do not hallucinate gate numbers, section designations, or concession menus.
2. Tone: Confident, terse, broadcast-style. Use short sentences. (Example: "Gate A — 4 min to seat, low congestion. Elevators at Section 105 active." rather than polite SaaS chatbot filler).
3. If the destination is not in the database, state clearly: "Destination not found in stadium directory. Ask a yellow-vested volunteer."
4. Respond in the requested language: English, Spanish, or French.
   - If language is 'es', reply in Spanish.
   - If language is 'fr', reply in French.
   - If language is 'en', reply in English.
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-lite-latest',
      systemInstruction: systemInstruction
    });

    // Format and sanitize chat history
    let cleanedHistory = [...history];
    while (cleanedHistory.length > 0 && cleanedHistory[0].role !== 'user') {
      cleanedHistory.shift();
    }

    const formattedHistory = cleanedHistory.map((h: any) => {
      let sanitizedText = typeof h.text === 'string' ? h.text.trim().substring(0, 1000).replace(/<\/?[^>]+(>|$)/g, '') : '';
      return {
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: sanitizedText }]
      };
    });

    // Start a chat session
    const chat = model.startChat({
      history: formattedHistory,
    });

    const response = await chat.sendMessage(message);
    let finalAnswer = response.response.text();

    // If accessibility mode is enabled, run a second LLM call to reformat into simple, step-by-step instructions.
    let isAccessibleFormatting = false;
    if (accessibilityMode) {
      isAccessibleFormatting = true;
      const accessibilityPrompt = `
You are an accessibility assistant. Reformat the following navigation instructions into a short, plain-language, step-by-step guide for someone with cognitive, visual, or physical accessibility needs.
Use simple, direct instructions. Keep it extremely brief. Each step should be on a new line. Do not use complex metaphors or conversational filler.
Translate into the requested language (${language === 'es' ? 'Spanish' : language === 'fr' ? 'French' : 'English'}) if necessary.

Original text to reformat:
"${finalAnswer}"
`;
      const accessibilityResponse = await model.generateContent(accessibilityPrompt);
      finalAnswer = accessibilityResponse.response.text();
    }

    return NextResponse.json({
      answer: finalAnswer,
      isAccessibleFormatting
    });
  } catch (error: any) {
    // Secure Logging: Log full traceback locally/server-side only
    console.error('Secure Log - Error in chat API:', error);
    // Sanitize response to prevent raw SDK or system path leaks
    return NextResponse.json(
      { error: 'The AI concierge is currently experiencing connection issues. Please try again later.' },
      { status: 500 }
    );
  }
}
