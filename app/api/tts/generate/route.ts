import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { synthesizeSpeech } from '../../../lib/tts/googleTts';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables on server');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ttsSchema = z.object({
  text: z.string().min(1),
  voice: z.string().optional(),
  format: z.enum(['mp3', 'wav']).optional(),
  targetType: z.enum(['word', 'sentence']).optional(),
  referenceId: z.string().uuid().optional(),
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
  const parse = ttsSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'Invalid input', details: parse.error.flatten() }, { status: 400 });

  const { text, voice, format = 'mp3', targetType = 'sentence', referenceId } = parse.data;

  // Call TTS helper to synthesize audio (placeholder implementation)
  const audioBuffer = await synthesizeSpeech(text, { voice, format });

  // Upload to Supabase Storage
  const fileName = `${user.id}/${targetType}-${referenceId ?? Date.now()}.${format}`;
  const upload = await supabaseAdmin.storage.from('app-audio').upload(fileName, Buffer.from(await audioBuffer.arrayBuffer()), {
    contentType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
    upsert: true,
  });

  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 });

  // Record upload metadata in uploads table
  const { data, error } = await supabaseAdmin.from('uploads').insert([{ user_id: user.id, storage_path: upload.data.path, file_name: fileName }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
