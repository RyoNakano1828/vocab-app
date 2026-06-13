import { z } from 'zod';

export const createWordSchema = z.object({
  word: z.string().min(1),
  language: z.string().optional().default('en'),
  meaning: z.any().optional(),
  phonetic: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateWordInput = z.infer<typeof createWordSchema>;
