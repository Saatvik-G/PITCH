import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getGeminiModel } from '@/lib/gemini';

interface TransitInput {
  id: string;
  name: string;
  type: string;
  congestionPercent: number;
  avgWaitTimeMin: number;
  status: string;
  associatedGate: string;
}

interface IncidentInput {
  id: string;
  text: string;
  category: string;
  status: string;
}

interface GateInput {
  id: string;
  name: string;
  occupancyPercent: number;
}

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
    const { transitModes, finalWhistleActive, incidents = [], gates = [] } = body as {
      transitModes: TransitInput[];
      finalWhistleActive: boolean;
      incidents?: IncidentInput[];
      gates?: GateInput[];
    };

    // 2. Input Structure Validation
    if (!Array.isArray(transitModes)) {
      return NextResponse.json({ error: 'Invalid transit metrics payload structure.' }, { status: 400 });
    }

    // 3. Input Sanitization & Bounds Checking
    const sanitizedModes = transitModes.map((m) => {
      const id = typeof m.id === 'string' ? m.id.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : '';
      const name = typeof m.name === 'string' ? m.name.substring(0, 100).replace(/<\/?[^>]+(>|$)/g, '') : '';
      const type = typeof m.type === 'string' ? m.type.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : '';
      const congestionPercent = typeof m.congestionPercent === 'number' ? Math.max(0, Math.min(100, m.congestionPercent)) : 0;
      const avgWaitTimeMin = typeof m.avgWaitTimeMin === 'number' ? Math.max(0, Math.min(180, m.avgWaitTimeMin)) : 0;
      const status = typeof m.status === 'string' ? m.status.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : 'Normal';
      const associatedGate = typeof m.associatedGate === 'string' ? m.associatedGate.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : '';
      return { id, name, type, congestionPercent, avgWaitTimeMin, status, associatedGate };
    });

    const sanitizedIncidents = incidents.map((inc) => {
      const id = typeof inc.id === 'string' ? inc.id.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : '';
      const text = typeof inc.text === 'string' ? inc.text.trim().substring(0, 1000).replace(/<\/?[^>]+(>|$)/g, '') : '';
      const category = typeof inc.category === 'string' ? inc.category.trim().substring(0, 100).replace(/<\/?[^>]+(>|$)/g, '') : 'General';
      const status = typeof inc.status === 'string' ? inc.status.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : 'Active';
      return { id, text, category, status };
    });

    const sanitizedGates = gates.map((g) => {
      const id = typeof g.id === 'string' ? g.id.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : '';
      const name = typeof g.name === 'string' ? g.name.substring(0, 100).replace(/<\/?[^>]+(>|$)/g, '') : '';
      const occupancyPercent = typeof g.occupancyPercent === 'number' ? Math.max(0, Math.min(100, g.occupancyPercent)) : 0;
      return { id, name, occupancyPercent };
    });

    const isWhistleActive = !!finalWhistleActive;

    const model = getGeminiModel({
      responseMimeType: 'application/json'
    });

    const prompt = `
You are the Lead Stadium Transit and Egress Director in the PITCH Arena control room.
Your job is to evaluate real-time transit status, live gate occupancies, active incidents, and whether the final whistle has been blown, to rank the 4 available transit modes from 1 (best/most recommended option right now) to 4 (worst/least recommended option right now).

CURRENT METRICS & STATE:
- Final Whistle Blown / Peak Egress active: ${isWhistleActive ? "YES" : "NO"}
- Transit Options: ${JSON.stringify(sanitizedModes, null, 2)}
- Live Gate Occupancy: ${JSON.stringify(sanitizedGates, null, 2)}
- Active Incidents in Stadium: ${JSON.stringify(sanitizedIncidents, null, 2)}

RANKING LOGIC / EGRESS RULES:
1. Metro (transit-metro) is connected to Gate A. If Gate A is highly congested (>80%) or has an incident, Metro ranking should drop. Metro is high-capacity and unaffected by street traffic, making it optimal during normal peaks unless Gate A is bottlenecked.
2. Shuttle Bus (transit-shuttle) connects Gate B & C. Good general backup. Under high egress, it provides relief to Metro, but has slower loading queues.
3. Parking Reservoirs (transit-parking) connect Gate E. If peak egress (final whistle) is active, parking lots will build up heavy vehicular exit backups, making parking exits congested, though wait time to reach vehicles is low.
4. Rideshare Hub (transit-rideshare) connects Gate D. During peak egress, rideshare experiences extreme surge pricing, long dispatch queues, and gridlock on stadium access roads, making it usually the worst (rank 4) option during final whistle peaks.

INSTRUCTIONS:
- Rank all 4 transit modes.
- Output a JSON array containing exactly 4 objects. Do not include markdown code block formatting (like \`\`\`json) or conversational text. Return only the raw JSON.
- For each object, provide the modeId (e.g. 'transit-metro'), the rank (number 1 to 4), a concise operations-focused reasoning statement, and an alternative egress routing instruction.

JSON Schema:
[
  {
    "modeId": "transit-metro",
    "rank": 1,
    "reasoning": "Metro has highest throughput and is running normal schedules; Gate A access flows are stable.",
    "alternateRouteSuggestion": "Proceed directly to Gate A. In case of platform queues, utilize Circular Shuttle at Gate B."
  }
]
`;

    const response = await model.generateContent(prompt);
    const textResponse = response.response.text();

    try {
      const recommendations = JSON.parse(textResponse.trim());
      if (Array.isArray(recommendations) && recommendations.length > 0) {
        return NextResponse.json(recommendations);
      }
      throw new Error('Invalid JSON structure returned by Gemini');
    } catch {
      console.error('Secure Log - Failed to parse Gemini transit recommendations:', textResponse);
      return NextResponse.json([
        {
          modeId: "transit-metro",
          rank: 1,
          reasoning: "Metro has highest egress capacity. Recommended rail routing.",
          alternateRouteSuggestion: "Egress via Gate A."
        },
        {
          modeId: "transit-parking",
          rank: 2,
          reasoning: "Parking reservoirs are accessible, although egress traffic flow is slow.",
          alternateRouteSuggestion: "Egress via Gate E to East Parking."
        },
        {
          modeId: "transit-shuttle",
          rank: 3,
          reasoning: "Shuttle bus lines are active but queue build times are rising.",
          alternateRouteSuggestion: "Egress via Gate B to Shuttle boarding bays."
        },
        {
          modeId: "transit-rideshare",
          rank: 4,
          reasoning: "Rideshare Hub experiencing peak egress gridlock and surge pricing.",
          alternateRouteSuggestion: "Avoid Rideshare Zone D; use Metro rail or Parking shuttle."
        }
      ]);
    }
  } catch (error: unknown) {
    console.error('Secure Log - Error in transit recommendations API:', error);
    return NextResponse.json(
      { error: 'Failed to generate transit recommendations due to an internal connection error.' },
      { status: 500 }
    );
  }
}
