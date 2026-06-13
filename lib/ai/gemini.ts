import fetch from 'node-fetch';

export type GeneratedExample = {
  wordId?: string | null;
  sentence: string;
  translation?: string | null;
  metadata?: Record<string, unknown> | null;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
const GEMINI_API_URL = process.env.GEMINI_API_URL ?? `https://generativeapi.googleapis.com/v1/models/${GEMINI_MODEL}:generate`;

function buildPromptForWord(word: string, options?: Record<string, unknown>) {
  // Prompt asks for one concise example sentence in English that uses the word, and a Japanese translation.
  const tone = options?.['tone'] ? `Tone: ${String(options['tone'])}.` : '';
  const difficulty = options?.['difficulty'] ? `Difficulty: ${String(options['difficulty'])}.` : '';
  return `Generate one natural English example sentence using the word "${word}". Provide a short natural Japanese translation. Output as JSON with keys: sentence, translation.` +
    `\n${tone} ${difficulty}`;
}

async function callGemini(prompt: string): Promise<any | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const body = {
      prompt,
      // client libraries typically expect more structured input; keep minimal for flexibility
      maxOutputTokens: 256,
      temperature: 0.2,
    } as any;

    const res = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Gemini API error', res.status, text);
      return null;
    }

    const json = await res.json();
    return json;
  } catch (err) {
    console.error('Gemini call failed', err);
    return null;
  }
}

export async function generateExamples(words: string[], options: Record<string, unknown> | undefined, userId: string): Promise<GeneratedExample[]> {
  // If no API key configured, return templated sentences (safe fallback for MVP)
  if (!GEMINI_API_KEY) {
    return words.map((w) => ({
      wordId: null,
      sentence: `The ${w} is important in many contexts.`,
      translation: `例: ${w} は多くの文脈で重要です。`,
      metadata: { generatedBy: 'mvp-fallback', options, userId },
    }));
  }

  const results: GeneratedExample[] = [];
  for (const w of words) {
    const prompt = buildPromptForWord(w, options);
    const raw = await callGemini(prompt);

    // Attempt to parse structured response
    let sentence = '';
    let translation = '';

    try {
      // Different Gemini endpoints/layers return different shapes. Try common patterns.
      // 1) Check for candidates[0].output or content
      if (raw?.candidates && Array.isArray(raw.candidates) && raw.candidates[0]) {
        const candidate = raw.candidates[0];
        const text = candidate?.content ?? candidate?.output ?? candidate?.text ?? null;
        if (typeof text === 'string') {
          // Try to extract JSON inside text
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            sentence = parsed.sentence ?? parsed.example ?? parsed.text ?? '';
            translation = parsed.translation ?? parsed.ja ?? parsed.jp ?? '';
          } else {
            // No JSON — use heuristics: split by newline, first line English, second line Japanese
            const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
            if (lines.length >= 2) {
              sentence = lines[0];
              translation = lines[1];
            } else {
              sentence = text;
              translation = '';
            }
          }
        }
      } else if (raw?.output) {
        const text = typeof raw.output === 'string' ? raw.output : raw.output?.text ?? '';
        sentence = String(text);
      } else if (typeof raw === 'string') {
        sentence = raw as string;
      }
    } catch (err) {
      console.error('Failed to parse Gemini response for', w, err);
    }

    // Fallback to a simple templated sentence if parsing failed
    if (!sentence) sentence = `The ${w} is important in many contexts.`;
    if (!translation) translation = `例: ${w} は多くの文脈で重要です。`;

    results.push({ wordId: null, sentence, translation, metadata: { generatedBy: 'gemini', rawShape: raw, options, userId } });
  }

  return results;
}
