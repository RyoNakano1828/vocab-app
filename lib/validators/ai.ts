import { z } from 'zod';

// Request body validator for /api/ai/generate-sentence
export const generateSentenceSchema = z.object({
  words: z.array(z.string().min(1)).min(1),
  // optional options object for future extension
  options: z
    .object({
      tone: z.string().optional(),
      maxExamples: z.number().int().positive().optional(),
    })
    .optional(),
});

export type GenerateSentenceRequest = z.infer<typeof generateSentenceSchema>;
