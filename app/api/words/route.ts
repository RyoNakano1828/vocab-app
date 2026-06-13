import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { createWordSchema } from '../../../lib/validators/word';

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

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') ?? undefined;
  const user = await getUserFromAuthHeader(authHeader);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const query = url.searchParams.get('q') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? '50');

  const { data, error } = await supabaseAdmin
    .from('words')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? undefined;
  const user = await getUserFromAuthHeader(authHeader);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parse = createWordSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid input', details: parse.error.flatten() }, { status: 400 });
  }

  const payload = parse.data;

  const { data, error } = await supabaseAdmin
    .from('words')
    .insert([{ user_id: user.id, word: payload.word, language: payload.language, meaning: payload.meaning, phonetic: payload.phonetic, metadata: payload.metadata }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
