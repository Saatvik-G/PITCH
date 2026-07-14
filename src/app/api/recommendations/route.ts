import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting Check (Max 20 RPM)
    const limitResult = rateLimit(request, 20);
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
    const { gates, sections, incidents = [] } = body;

    // 2. Input Structure Validation
    if (!Array.isArray(gates) || !Array.isArray(sections) || !Array.isArray(incidents)) {
      return NextResponse.json({ error: 'Invalid metrics payload structure.' }, { status: 400 });
    }

    // 3. Input Sanitization & Data Bounding
    const sanitizedIncidents = incidents.map((inc: any) => {
      let text = typeof inc.text === 'string' ? inc.text.trim().substring(0, 1000).replace(/<\/?[^>]+(>|$)/g, '') : '';
      let category = typeof inc.category === 'string' ? inc.category.trim().substring(0, 100).replace(/<\/?[^>]+(>|$)/g, '') : 'General';
      let id = typeof inc.id === 'string' ? inc.id.trim().substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : 'INC-GEN';
      return { ...inc, id, text, category };
    });

    const sanitizedGates = gates.map((g: any) => {
      let id = typeof g.id === 'string' ? g.id.substring(0, 20) : '';
      let name = typeof g.name === 'string' ? g.name.substring(0, 50) : '';
      let occupancyPercent = typeof g.occupancyPercent === 'number' ? Math.max(0, Math.min(100, g.occupancyPercent)) : 0;
      return { ...g, id, name, occupancyPercent };
    });

    const sanitizedSections = sections.map((s: any) => {
      let id = typeof s.id === 'string' ? s.id.substring(0, 20) : '';
      let name = typeof s.name === 'string' ? s.name.substring(0, 50) : '';
      let occupancyPercent = typeof s.occupancyPercent === 'number' ? Math.max(0, Math.min(100, s.occupancyPercent)) : 0;
      return { ...s, id, name, occupancyPercent };
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server.' },
        { status: 500 }
      );
    }

    // Load venue data as static context for RAG validation
    const venuePath = path.join(process.cwd(), 'src', 'data', 'venue.json');
    const venueDataRaw = await fs.readFile(venuePath, 'utf8');
    const venueData = JSON.parse(venueDataRaw);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-lite-latest',
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
- Gates (current occupancy %): ${JSON.stringify(sanitizedGates, null, 2)}
- Sections (current occupancy %): ${JSON.stringify(sanitizedSections, null, 2)}
- Active Incidents: ${JSON.stringify(sanitizedIncidents, null, 2)}

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
      console.error('Secure Log - Failed to parse Gemini recommendations output:', textResponse);
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
    // Secure Logging: Log traceback server-side only
    console.error('Secure Log - Error in recommendations API:', error);
    // Sanitize response
    return NextResponse.json(
      { error: 'Failed to generate recommendations due to an internal connection error.' },
      { status: 500 }
    );
  }
}
