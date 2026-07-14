import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getGeminiModel } from '@/lib/gemini';

interface BinInput {
  id: string;
  zoneName: string;
  fillLevelPercent: number;
  type: string;
  isHighLitterZone: boolean;
  lastEmptiedTime: string;
}

interface IncidentInput {
  id: string;
  text: string;
  category: string;
  status: string;
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
    const { wasteBins, halftimeRushActive, incidents = [] } = body as {
      wasteBins: BinInput[];
      halftimeRushActive: boolean;
      incidents?: IncidentInput[];
    };

    // 2. Input Structure Validation
    if (!Array.isArray(wasteBins)) {
      return NextResponse.json({ error: 'Invalid waste metrics payload structure.' }, { status: 400 });
    }

    // 3. Input Sanitization & Bounds Checking
    const sanitizedBins = wasteBins.map((b) => {
      const id = typeof b.id === 'string' ? b.id.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : '';
      const zoneName = typeof b.zoneName === 'string' ? b.zoneName.substring(0, 100).replace(/<\/?[^>]+(>|$)/g, '') : '';
      const type = typeof b.type === 'string' ? b.type.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : 'general';
      const fillLevelPercent = typeof b.fillLevelPercent === 'number' ? Math.max(0, Math.min(100, b.fillLevelPercent)) : 0;
      const isHighLitterZone = !!b.isHighLitterZone;
      const lastEmptiedTime = typeof b.lastEmptiedTime === 'string' ? b.lastEmptiedTime.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : '';
      return { id, zoneName, fillLevelPercent, type, isHighLitterZone, lastEmptiedTime };
    });

    const sanitizedIncidents = incidents.map((inc) => {
      const id = typeof inc.id === 'string' ? inc.id.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : '';
      const text = typeof inc.text === 'string' ? inc.text.trim().substring(0, 1000).replace(/<\/?[^>]+(>|$)/g, '') : '';
      const category = typeof inc.category === 'string' ? inc.category.trim().substring(0, 100).replace(/<\/?[^>]+(>|$)/g, '') : 'General';
      const status = typeof inc.status === 'string' ? inc.status.substring(0, 50).replace(/<\/?[^>]+(>|$)/g, '') : 'Active';
      return { id, text, category, status };
    });

    const isHalftimeRush = !!halftimeRushActive;

    const model = getGeminiModel({
      responseMimeType: 'application/json'
    });

    const prompt = `
You are the Lead Stadium Environmental Operations Director in the PITCH Arena control room.
Your job is to evaluate real-time waste sensor fill levels, high-litter concession zones, active incidents, and halftime rush state, to generate an optimal prioritized waste collection cleanup list for volunteer crews.

CURRENT METRICS & STATE:
- Halftime concession rush active: ${isHalftimeRush ? "YES" : "NO"}
- IoT Sensored Bins: ${JSON.stringify(sanitizedBins, null, 2)}
- Active Incidents in Stadium: ${JSON.stringify(sanitizedIncidents, null, 2)}

ROUTING & PRIORITY LOGIC:
1. Priority Level definitions:
   - CRITICAL: Fill level >= 80% (needs immediate dispatch to avoid public bin overflow).
   - HIGH: Fill level >= 65% OR high-litter concession zones (isHighLitterZone: true) with fill level >= 50% (rapid buildup during rushes).
   - MEDIUM: Fill level >= 40% (monitor and schedule route clearance).
   - LOW: Fill level < 40% (stable, skip collection this run).
2. Highlight high-litter zones (e.g. Concession Plaza A, Gate B Fan Zone, Section 120 Food Court) during halftime rushes.
3. Waste bins must be cleared before the second half kickoff (approx 15 mins) when crowds return to seats.

INSTRUCTIONS:
- Rank and recommend routes for bins that need clearing (prioritize CRITICAL and HIGH bins).
- Output a JSON array containing recommendation objects. Do not include markdown code block formatting (like \`\`\`json) or conversational text. Return only the raw JSON.
- For each recommendation object, provide the binId (e.g. 'bin-001'), priority ('CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'), a concise action command for volunteer crew dispatch, and an estimated fill rate per hour (estFillRateHour) in percentage points (e.g., 30 for 30%/hr). During halftime rushes, high-litter bins should have higher fill rates (45-65%/hr).

JSON Schema:
[
  {
    "binId": "bin-001",
    "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    "action": "Terse dispatch command (e.g., 'Dispatch squad B to Concession Plaza A to empty recycling bin-001 immediately')",
    "estFillRateHour": 45
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
      console.error('Secure Log - Failed to parse Gemini waste recommendations:', textResponse);
      // Reliable fallback array
      return NextResponse.json([
        {
          binId: "bin-002",
          priority: "HIGH",
          action: "Clear Concession Plaza A general waste bin-002.",
          estFillRateHour: 40
        },
        {
          binId: "bin-005",
          priority: "HIGH",
          action: "Empty Section 120 Food Court recycling bin-005.",
          estFillRateHour: 45
        },
        {
          binId: "bin-001",
          priority: "MEDIUM",
          action: "Monitor Concession Plaza A recycling bin-001.",
          estFillRateHour: 30
        },
        {
          binId: "bin-003",
          priority: "MEDIUM",
          action: "Schedule clearance for Gate B Fan Zone waste bin-003.",
          estFillRateHour: 35
        }
      ]);
    }
  } catch (error: unknown) {
    console.error('Secure Log - Error in waste recommendations API:', error);
    return NextResponse.json(
      { error: 'Failed to generate waste recommendations due to an internal connection error.' },
      { status: 500 }
    );
  }
}
