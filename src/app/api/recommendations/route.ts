import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { gates, sections, incidents = [] } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server. Please set GEMINI_API_KEY.' },
        { status: 500 }
      );
    }

    // Load venue data as static context for RAG validation
    const venuePath = path.join(process.cwd(), 'src', 'data', 'venue.json');
    const venueDataRaw = await fs.readFile(venuePath, 'utf8');
    const venueData = JSON.parse(venueDataRaw);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const prompt = `
You are the Lead Stadium Operations Director in the PITCH Arena control room.
Your job is to analyze real-time metrics and issue 3-4 highly specific, actionable operations commands to manage crowd flow, alleviate gate backups, and respond to incidents.

VENUE REFERENCE:
${JSON.stringify(venueData, null, 2)}

CURRENT REAL-TIME METRICS:
- Gates (current occupancy %): ${JSON.stringify(gates, null, 2)}
- Sections (current occupancy %): ${JSON.stringify(sections, null, 2)}
- Active Incidents: ${JSON.stringify(incidents, null, 2)}

INSTRUCTIONS:
1. Identify bottleneck gates (e.g. occupancy > 75%) or areas with incidents.
2. Recommend routing adjustments, redirecting fans from congested gates to under-utilized nearby gates.
3. Formulate response commands for active incidents (e.g., dispatching personnel, blocking lanes, directing flow away from the incident area).
4. Tone must be direct, broadcast-style, and operations-focused.
5. You MUST return a JSON array containing exactly 3 to 4 recommendation objects. Do not include markdown code block syntax (like \`\`\`json) or any conversational text. Return only the raw JSON.

JSON Schema:
[
  {
    "id": "REC-001",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "alert": "Brief summary of the bottleneck or incident (e.g. 'Gate B Congested at 84%')",
    "action": "Terse command-style action (e.g. 'Divert parking shuttle arrivals from Gate B to Gate A')",
    "impact": "Quantified operational impact (e.g. 'Reduces Gate B queue time by 5m, adds 3m walk')"
  }
]
`;

    const response = await model.generateContent(prompt);
    const textResponse = response.response.text();

    // Parse the JSON safely
    try {
      const recommendations = JSON.parse(textResponse.trim());
      return NextResponse.json(recommendations);
    } catch (parseError) {
      console.error('Failed to parse Gemini recommendations output:', textResponse);
      // Fallback in case of json parsing issues
      return NextResponse.json([
        {
          id: "FALLBACK-001",
          priority: "HIGH",
          alert: "Gate flow optimization required.",
          action: "Monitor Gate B and Gate E and manually balance flow.",
          impact: "Prevents critical queue build-up."
        }
      ]);
    }
  } catch (error: any) {
    console.error('Error in recommendations API:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during the request.' },
      { status: 500 }
    );
  }
}
