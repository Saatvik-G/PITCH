import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { message, history = [], language = 'en', accessibilityMode = false } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server. Please set GEMINI_API_KEY.' },
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
      model: 'gemini-3.5-flash',
      systemInstruction: systemInstruction
    });

    // Format chat history for Google Generative AI
    // SDK expects format: [{ role: 'user' | 'model', parts: [{ text: string }] }]
    // Ensure history starts with a 'user' message as required by the API
    let cleanedHistory = [...history];
    while (cleanedHistory.length > 0 && cleanedHistory[0].role !== 'user') {
      cleanedHistory.shift();
    }

    const formattedHistory = cleanedHistory.map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

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
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during the request.' },
      { status: 500 }
    );
  }
}
