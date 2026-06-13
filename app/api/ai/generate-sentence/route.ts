import { NextResponse } from 'next/server';
import { generateSentenceSchema } from '../../../lib/validators/ai';
import { generateExamples } from '../../../lib/ai/gemini';

// This route intentionally allows unauthenticated requests in development.
// It validates the incoming body, then calls the LLM wrapper (which falls back to a mock when no API keys are present).

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = generateSentenceSchema.parse(body);

    // Call the LLM wrapper. lib/ai/gemini.ts will return a mock if no API keys are configured.
    const outputs = await generateExamples(parsed.words || []);

    return NextResponse.json(
      { examples: outputs.map((s) => ({ sentence: s })) },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('/api/ai/generate-sentence error', err);
    if (err?.issues) {
      // Zod validation error
      return NextResponse.json({ error: 'validation', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
