import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiModelOptions {
  systemInstruction?: string;
  responseMimeType?: string;
}

export function getGeminiModel(options: GeminiModelOptions = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured on the server.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-flash-lite-latest',
    systemInstruction: options.systemInstruction,
    generationConfig: options.responseMimeType 
      ? { responseMimeType: options.responseMimeType } 
      : undefined,
  });
}
