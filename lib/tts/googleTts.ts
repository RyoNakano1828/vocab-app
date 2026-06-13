import { TextToSpeechClient } from '@google-cloud/text-to-speech';

export type SynthesizeOptions = {
  voice?: string; // e.g., 'en-US-Wavenet-D' or 'en-US-Standard-B'
  languageCode?: string; // e.g., 'en-US'
  format?: 'mp3' | 'wav';
  speakingRate?: number;
  pitch?: number;
};

// Use GOOGLE_APPLICATION_CREDENTIALS or application-default credentials
let client: TextToSpeechClient | null = null;
try {
  // Lazy initialize when module loads in Node environment
  client = new TextToSpeechClient();
} catch (err) {
  // If credentials are missing or package not installed, we will fallback later
  console.warn('Google TTS client not initialized. Make sure @google-cloud/text-to-speech is installed and credentials are set.', err);
  client = null;
}

export async function synthesizeSpeech(text: string, opts: SynthesizeOptions = {}): Promise<Buffer> {
  // If client unavailable, return a dummy buffer so higher layers can continue during development
  if (!client) {
    console.warn('synthesizeSpeech: Google TTS client not available, returning dummy buffer');
    return Buffer.from([0, 1, 2, 3]);
  }

  const languageCode = opts.languageCode ?? 'en-US';
  const voiceName = opts.voice ?? (languageCode === 'ja-JP' ? 'ja-JP-Standard-B' : 'en-US-Standard-B');
  const audioEncoding = opts.format === 'wav' ? 'LINEAR16' : 'MP3';

  const request = {
    input: { text },
    // See: https://cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
    voice: { languageCode, name: voiceName },
    audioConfig: { audioEncoding, speakingRate: opts.speakingRate ?? 1.0, pitch: opts.pitch ?? 0.0 },
  } as any;

  try {
    const [response] = await client.synthesizeSpeech(request);
    const audioContent = response.audioContent as string | undefined;
    if (!audioContent) throw new Error('No audioContent in TTS response');
    return Buffer.from(audioContent, 'base64');
  } catch (err) {
    console.error('Google TTS synthesizeSpeech failed', err);
    // Rethrow so caller can handle failure
    throw err;
  }
}
