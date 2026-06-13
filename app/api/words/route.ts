import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.warn('Missing Supabase env in /api/words route — ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
}

const supabaseAdmin = createClient(SUPABASE_URL || '', SERVICE_KEY || '', {
  auth: { persistSession: false },
});

const createWordSchema = z.object({
  word: z.string().min(1),
  language: z.string().optional().default('en'),
  meaning: z.any().nullable().optional(),
  phonetic: z.string().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
  examples: z
    .array(
      z.object({
        sentence: z.string().min(1),
        translation: z.string().nullable().optional(),
        metadata: z.any().nullable().optional(),
      })
    )
    .optional()
    .default([]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createWordSchema.parse(body);

    // Insert the word row
    const { data: wordRow, error: wordErr } = await supabaseAdmin
      .from('words')
      .insert([
        {
          user_id: parsed.user_id ?? null,
          word: parsed.word,
          language: parsed.language,
          meaning: parsed.meaning ?? null,
          phonetic: parsed.phonetic ?? null,
        },
      ])
      .select()
      .maybeSingle();

    if (wordErr) {
      console.error('insert word error', wordErr);
      return NextResponse.json({ error: wordErr.message || String(wordErr) }, { status: 500 });
    }

    // Insert examples if provided
    let insertedExamples: any[] = [];
    if (parsed.examples && parsed.examples.length > 0) {
      const rows = parsed.examples.map((ex) => ({
        user_id: parsed.user_id ?? null,
        word_id: wordRow?.id,
        sentence: ex.sentence,
        translation: ex.translation ?? null,
        metadata: ex.metadata ?? null,
      }));

      const { data: exData, error: exErr } = await supabaseAdmin.from('examples').insert(rows).select();
      if (exErr) {
        console.error('insert examples error', exErr);
        // Note: we don't roll back the created word here; consider implementing a DB transaction or RPC for atomicity.
        return NextResponse.json({ error: exErr.message || String(exErr) }, { status: 500 });
      }
      insertedExamples = exData || [];
    }

    return NextResponse.json({ ...wordRow, examples: insertedExamples }, { status: 201 });
  } catch (err: any) {
    console.error('/api/words POST error', err);
    if (err?.issues) {
      // Zod validation errors
      return NextResponse.json({ error: 'validation', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
