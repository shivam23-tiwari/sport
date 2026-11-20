import { GoogleGenAI, ThinkingLevel } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Optional Google-Search-grounded Gemini fallback.
 * Returns null if GEMINI_API_KEY is missing or if upstream search fails.
 * Never fabricates data: prompts strictly require verified current results or empty JSON.
 */
export async function queryGroundedJson<T>(prompt: string): Promise<T | null> {
  const ai = getAiClient();
  if (!ai) return null;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Today's date is ${today}. Use Google Search to find strictly factual, real-world sports data.\n\n${prompt}\n\nIMPORTANT: Return ONLY valid JSON (no markdown fences, no commentary). If you cannot verify real current data via search, return an empty JSON array [] or empty object {}. NEVER invent or guess scores or fixtures.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const raw = (response.text ?? '').trim();
    if (!raw) return null;

    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.warn('[Gemini Grounding Fallback] skipped:', (err as Error)?.message);
    return null;
  }
}
