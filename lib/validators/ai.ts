import { z } from 'zod';

export const generateSentenceSchema = z.object({
  words: z.array(z.string().min(1)).min(1),
  options: z.object({
    tone: z.string().optional(),
    difficulty: z.string().optional(),
  }).optional(),
});

export type GenerateSentenceInput = z.infer<typeof generateSentenceSchema>;
