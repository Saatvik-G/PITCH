import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { reports = [], language = 'en' } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server. Please set GEMINI_API_KEY.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
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
${JSON.stringify(reports, null, 2)}

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
      console.error('Failed to parse Gemini briefing output:', textResponse);
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
    console.error('Error in briefing API:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during the request.' },
      { status: 500 }
    );
  }
}
