"use server";

import { generateExamples } from '../lib/ai/gemini';
import { supabaseAdmin } from '../lib/supabaseServer';
import { GenerateSentenceInput } from '../lib/validators/ai';

export async function generateSentenceAction(input: GenerateSentenceInput, authToken: string) {
  // Validate authToken by calling Supabase admin auth.getUser
  const { data, error } = await supabaseAdmin.auth.getUser(authToken);
  if (error || !data?.user) throw new Error('Unauthorized');
  const user = data.user;

  // Ensure each word exists, create if missing
  const wordIdMap: Record<string, string> = {};
  for (const w of input.words) {
    const { data: existing, error: selError } = await supabaseAdmin
      .from('words')
      .select('id')
      .ilike('word', w)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .limit(1);
    if (selError) throw selError;
    if (existing && existing.length > 0) {
      wordIdMap[w] = existing[0].id;
    } else {
      const { data: inserted, error: insError } = await supabaseAdmin
        .from('words')
        .insert([{ user_id: user.id, word: w, language: 'en' }])
        .select()
        .single();
      if (insError) throw insError;
      wordIdMap[w] = inserted.id;
    }
  }

  const examples = await generateExamples(input.words, input.options, user.id);

  const inserts = examples.map((ex, idx) => ({
    user_id: user.id,
    word_id: wordIdMap[input.words[idx]] ?? null,
    sentence: ex.sentence,
    translation: ex.translation,
    metadata: ex.metadata,
  }));

  const res = await supabaseAdmin.from('examples').insert(inserts).select();
  if (res.error) throw res.error;
  return res.data;
}
