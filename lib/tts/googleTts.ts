/**
 * Placeholder Google Cloud Text-to-Speech wrapper.
 * Replace with real @google-cloud/text-to-speech usage.
 */

export async function synthesizeSpeech(text: string, opts?: { voice?: string; format?: string }): Promise<Blob> {
  // MVP mock: return a small silent WAV/MP3-like buffer as Blob
  // In real implementation, call Google Cloud TTS and return ArrayBuffer or Blob of audio data
  const dummy = new Uint8Array([0, 1, 2, 3]);
  return new Blob([dummy.buffer]);
}
