import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { generateExamples } from '../../../lib/ai/gemini';
import { generateSentenceSchema } from '../../../lib/validators/ai';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables on server');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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

  // Call AI helper (placeholder) to generate examples
  const examples = await generateExamples(words, options, user.id);

  // Persist examples in DB
  const inserts = examples.map((ex) => ({ user_id: user.id, word_id: ex.wordId, sentence: ex.sentence, translation: ex.translation, metadata: ex.metadata }));
  const { data, error } = await supabaseAdmin.from('examples').insert(inserts).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
