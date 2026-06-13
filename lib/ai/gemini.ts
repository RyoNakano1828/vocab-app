// lib/ai/gemini.ts
// Minimal wrapper for example generation.
// - If GEMINI_API_KEY and GEMINI_API_URL are set, it will POST { words } to GEMINI_API_URL with Bearer auth.
// - Otherwise it returns a simple mocked example so the UI works in dev.
//
// Adjust the request/response parsing to match your actual Gemini/LLM integration.

export async function generateExamples(words: string[]): Promise<string[]> {
  if (!words || words.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = process.env.GEMINI_API_URL; // optional, set to your Gemini endpoint if available

  // Fallback mock if no API config
  if (!apiKey || !apiUrl) {
    const w = words[0];
    return [`This is an example sentence using "${w}".`];
  }

  try {
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ words }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`LLM request failed: ${resp.status} ${text}`);
    }

    const json = await resp.json();

    // Try several common shapes (adjust to your provider)
    // - { examples: [{ sentence: "..." }] }
    // - { example: "..." } or { text: "..." } or { generated: "..." }
    if (Array.isArray(json.examples) && json.examples[0]?.sentence) {
      return json.examples.map((e: any) => e.sentence);
    }
    if (json.example) return [json.example];
    if (json.text) return [json.text];
    if (json.generated) return [json.generated];

    // If your provider returns a nested output (e.g. .output_text or .candidates)
    if (json.output_text) return [json.output_text];
    if (Array.isArray(json.candidates) && json.candidates[0]?.content) {
      return json.candidates.map((c: any) => c.content);
    }

    // Last resort: stringify entire response
    return [JSON.stringify(json)];
  } catch (err) {
    console.error("generateExamples error:", err);
    // On error, return a harmless fallback so UI remains responsive
    return [`(mock) Example for "${words[0]}" (LLM failed: ${String(err).slice(0, 120)})`];
  }
}
