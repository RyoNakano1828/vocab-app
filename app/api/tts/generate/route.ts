import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { synthesizeSpeech } from '../../../../lib/tts/googleTts';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

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

  let audioBuffer: Buffer;
  try {
    audioBuffer = await synthesizeSpeech(text, { voice, format });
  } catch (err: any) {
    console.error('TTS synth failed', err);
    return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 500 });
  }

  const fileName = `${user.id}/${targetType}-${referenceId ?? Date.now()}.${format}`;
  const upload = await supabaseAdmin.storage.from('app-audio').upload(fileName, audioBuffer, {
    contentType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
    upsert: true,
  });

  if (upload.error) {
    console.error('Storage upload failed', upload.error);
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  // Record upload metadata in uploads table
  const { data, error } = await supabaseAdmin
    .from('uploads')
    .insert([{ user_id: user.id, storage_path: upload.data.path, file_name: fileName }])
    .select()
    .single();
  if (error) {
    console.error('Failed to record upload', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If referenceId provided, update the target record to link to the audio
  try {
    if (referenceId) {
      if (targetType === 'word') {
        await supabaseAdmin
          .from('words')
          .update({ audio_path: upload.data.path })
          .eq('id', referenceId)
          .eq('user_id', user.id);
      } else if (targetType === 'sentence') {
        await supabaseAdmin
          .from('examples')
          .update({ sentence_audio_path: upload.data.path })
          .eq('id', referenceId)
          .eq('user_id', user.id);
      }
    }
  } catch (err) {
    console.error('Failed to update reference with audio path', err);
    // Not fatal — still return success for upload
  }

  return NextResponse.json({ data }, { status: 201 });
}
