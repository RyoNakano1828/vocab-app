import { NextResponse } from 'next/server';
import { generateSentenceSchema } from '../../../../lib/validators/ai';
import { generateExamples } from '../../../../lib/ai/gemini';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

async function getUserFromAuthHeader(authHeader?: string) {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;
  const token = parts[1];
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? undefined;
  const user = await getUserFromAuthHeader(authHeader);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parse = generateSentenceSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid input', details: parse.error.flatten() }, { status: 400 });
  }

  const { words, options } = parse.data;

  // Ensure each word exists (owned by user). If not, create it.
  const wordIdMap: Record<string, string> = {};
  for (const w of words) {
    // Try to find existing word (case-insensitive)
    const { data: existing, error: selError } = await supabaseAdmin
      .from('words')
      .select('id')
      .ilike('word', w)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .limit(1);

    if (selError) {
      console.error('DB lookup error for word', w, selError);
      return NextResponse.json({ error: selError.message }, { status: 500 });
    }

    if (existing && existing.length > 0) {
      wordIdMap[w] = existing[0].id;
    } else {
      const { data: inserted, error: insError } = await supabaseAdmin
        .from('words')
        .insert([{ user_id: user.id, word: w, language: 'en' }])
        .select()
        .single();
      if (insError) {
        console.error('DB insert error for word', w, insError);
        return NextResponse.json({ error: insError.message }, { status: 500 });
      }
      wordIdMap[w] = inserted.id;
    }
  }

  // Call AI helper (Gemini) to generate examples
  const examples = await generateExamples(words, options, user.id);

  // Attach correct word_id to each generated example and persist
  const inserts = examples.map((ex, idx) => {
    const w = words[idx];
    return {
      user_id: user.id,
      word_id: wordIdMap[w] ?? null,
      sentence: ex.sentence,
      translation: ex.translation,
      metadata: ex.metadata,
    };
  });

  const { data, error } = await supabaseAdmin.from('examples').insert(inserts).select();
  if (error) {
    console.error('Failed to insert examples', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
