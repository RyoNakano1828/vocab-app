"use server";

import { generateExamples } from '../lib/ai/gemini';
import { supabaseAdmin } from '../lib/supabaseServer';
import { GenerateSentenceInput } from '../lib/validators/ai';

export async function generateSentenceAction(input: GenerateSentenceInput, authToken: string) {
  // Validate authToken by calling Supabase admin auth.getUser
  const { data, error } = await supabaseAdmin.auth.getUser(authToken);
  if (error || !data?.user) throw new Error('Unauthorized');
  const user = data.user;

  const examples = await generateExamples(input.words, input.options, user.id);

  // Persist
  const inserts = examples.map((ex) => ({ user_id: user.id, word_id: null, sentence: ex.sentence, translation: ex.translation, metadata: ex.metadata }));
  const res = await supabaseAdmin.from('examples').insert(inserts).select();
  if (res.error) throw res.error;
  return res.data;
}
