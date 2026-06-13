/**
 * Placeholder Gemini AI helper
 * Replace with real Gemini API integration when ready.
 */

export type GeneratedExample = {
  wordId?: string | null; // optional: if provided by caller
  sentence: string;
  translation?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function generateExamples(words: string[], options: Record<string, unknown> | undefined, userId: string): Promise<GeneratedExample[]> {
  // For MVP, return simple templated sentences. Replace with real API calls later.
  return words.map((w) => ({
    wordId: null,
    sentence: `Example: The ${w} is important in many contexts.`,
    translation: `例: ${w} は多くの文脈で重要です。`,
    metadata: { generatedBy: 'mvp-mock', options, userId },
  }));
}
