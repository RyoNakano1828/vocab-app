// lib/ai/gemini.ts
// Gemini/LLM integration helper.
// Behavior:
// - If GEMINI_PROVIDER=google and GEMINI_API_KEY + GEMINI_MODEL are set, it will call the
//   Google Generative Language API (generativelanguage.googleapis.com) using the provided model.
// - Otherwise, if GEMINI_API_URL and GEMINI_API_KEY are set, it will POST { words } to GEMINI_API_URL with Bearer auth.
// - If no API credentials are configured, it returns a safe local mock so the UI works in dev.

type Json = any;

export async function generateExamples(words: string[]): Promise<string[]> {
  if (!words || words.length === 0) return [];
  const w = words[0];

  const provider = (process.env.GEMINI_PROVIDER || '').toLowerCase();
  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrlEnv = process.env.GEMINI_API_URL; // optional override
  const model = process.env.GEMINI_MODEL; // e.g. 'text-bison-001' or 'models/text-bison-001'

  // If provider=google and required vars exist -> use Google Generative Language API
  if (provider === 'google' && apiKey && model) {
    try {
      const base = apiUrlEnv || 'https://generativelanguage.googleapis.com';
      // Normalize model path: allow 'text-bison-001' or 'models/text-bison-001'
      const modelPath = model.startsWith('models/') ? model : `models/${model}`;
      const url = `${base}/v1/${modelPath}:generateText?key=${apiKey}`;

      // Build a concise prompt from the word
      const prompt = `Write a single, simple example sentence using the word "${w}" in natural English.`;

      const body = {
        prompt: { text: prompt },
        // Tweak generation params as needed
        maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 128),
        temperature: Number(process.env.GEMINI_TEMPERATURE || 0.2),
      } as Json;

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Google LLM request failed: ${resp.status} ${txt}`);
      }

      const json = await resp.json();
      // Google responses often include 'candidates' with 'output' or 'content' fields
      // Try several shapes defensively.
      if (Array.isArray(json.candidates) && json.candidates.length > 0) {
        const out = json.candidates
          .map((c: any) => c.output || c.content || c.text || c["output"])
          .filter(Boolean);
        if (out.length) return out;
      }
      // Some responses may include 'output' or 'output_text'
      if (json.output) return [json.output];
      if (json.output_text) return [json.output_text];

      // Fallback: stringify
      return [JSON.stringify(json)];
    } catch (err) {
      console.error('generateExamples (google) error', err);
      return [`(mock) Example for "${w}" (google LLM failed: ${String(err).slice(0,120)})`];
    }
  }

  // Generic HTTP POST mode: send { words } with Bearer token if provided
  if (apiUrlEnv && apiKey) {
    try {
      const resp = await fetch(apiUrlEnv, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ words }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`LLM request failed: ${resp.status} ${txt}`);
      }

      const json = await resp.json();
      // Try several common shapes
      if (Array.isArray(json.examples) && json.examples[0]?.sentence) {
        return json.examples.map((e: any) => e.sentence);
      }
      if (json.example) return [json.example];
      if (json.text) return [json.text];
      if (json.generated) return [json.generated];
      if (json.output_text) return [json.output_text];
      if (Array.isArray(json.candidates) && json.candidates[0]?.content) {
        return json.candidates.map((c: any) => c.content);
      }

      return [JSON.stringify(json)];
    } catch (err) {
      console.error('generateExamples (generic) error', err);
      return [`(mock) Example for "${w}" (LLM failed: ${String(err).slice(0,120)})`];
    }
  }

  // No provider configured: return a simple mock so the UI works in dev
  return [`This is an example sentence using "${w}".`];
}
