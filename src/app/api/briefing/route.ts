import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
    let { reports = [], language = 'en' } = body;

    // 2. Structure Validation
    if (!Array.isArray(reports)) {
      return NextResponse.json({ error: 'Reports must be a valid array.' }, { status: 400 });
    }

    // Guard against large arrays to prevent context-exhaustion attacks
    if (reports.length > 50) {
      reports = reports.slice(0, 50);
    }

    if (typeof language !== 'string' || !['en', 'es', 'fr'].includes(language)) {
      language = 'en';
    }

    // 3. Input Sanitization & Tag Stripping
    const sanitizedReports = reports
      .map((r: any) => {
        if (typeof r !== 'string') return '';
        return r.trim().substring(0, 500).replace(/<\/?[^>]+(>|$)/g, '');
      })
      .filter(Boolean);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-lite-latest',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const languageNames: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French'
    };

    const targetLang = languageNames[language] || 'English';

    const prompt = `
You are the Operations Chief at PITCH Arena.
Your task is to review a feed of raw, messy radio-call logs, volunteer text reports, and facilities entries, and compile them into a structured briefing for the shift volunteers and staff.

All output fields, summaries, and actions MUST be written in ${targetLang}.

RAW FEED:
${JSON.stringify(sanitizedReports, null, 2)}

INSTRUCTIONS:
1. Summarize and categorize each report.
2. Group them into three categories:
   - "topPriorities": Critical safety, crowd backup, or accessibility issues requiring immediate attention or tracking.
   - "resolved": Incidents that have been successfully resolved, addressed, or are fully under control.
   - "watchList": Minor issues, food/water shortages, or developing concerns to keep an eye on during the next hour.
3. Be concise and use command-center terminology. Keep summaries under 15 words.
4. Output MUST be valid JSON matching the schema below. Do not wrap in markdown code blocks.

JSON Schema:
{
  "topPriorities": [
    {
      "id": "REP-XXX",
      "summary": "Brief summary of the issue in ${targetLang}",
      "action": "Terse directive for staff/volunteers in ${targetLang}"
    }
  ],
  "resolved": [
    {
      "id": "REP-XXX",
      "summary": "Brief summary of what was resolved in ${targetLang}",
      "status": "Resolution details (e.g. 'Cleaned', 'Turnstile rebooted') in ${targetLang}"
    }
  ],
  "watchList": [
    {
      "id": "REP-XXX",
      "summary": "Developing concern in ${targetLang}",
      "status": "Current status / next check in ${targetLang}"
    }
  ]
}
`;

    const response = await model.generateContent(prompt);
    const textResponse = response.response.text();

    try {
      const briefing = JSON.parse(textResponse.trim());
      return NextResponse.json(briefing);
    } catch (parseError) {
      console.error('Secure Log - Failed to parse Gemini briefing output:', textResponse);
      return NextResponse.json({
        topPriorities: [
          {
            id: "WARN-999",
            summary: "Failed to compile briefing automatically.",
            action: "Review raw logs manually."
          }
        ],
        resolved: [],
        watchList: []
      });
    }
  } catch (error: any) {
    // Secure Logging: Log traceback server-side only
    console.error('Secure Log - Error in briefing API:', error);
    // Sanitize response
    return NextResponse.json(
      { error: 'Failed to generate briefing due to a connection timeout.' },
      { status: 500 }
    );
  }
}
