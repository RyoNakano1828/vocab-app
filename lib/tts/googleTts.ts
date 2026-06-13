import { TextToSpeechClient } from '@google-cloud/text-to-speech';

export type SynthesizeOptions = {
  voice?: string; // e.g., 'en-US-Wavenet-D' or 'en-US-Standard-B'
  languageCode?: string; // e.g., 'en-US'
  format?: 'mp3' | 'wav';
  speakingRate?: number;
  pitch?: number;
};

let client: TextToSpeechClient | null = null;

function initClientFromEnv() {
  // Priority:
  // 1) If GOOGLE_APPLICATION_CREDENTIALS_JSON is provided (Vercel-friendly), use it.
  // 2) Otherwise fall back to application-default credentials (TextToSpeechClient will handle).
  if (client) return;

  const jsonEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

  if (jsonEnv) {
    try {
      // Allow the JSON to be stored either as a raw JSON string or with escaped newlines in private_key
      const cred = typeof jsonEnv === 'string' ? JSON.parse(jsonEnv) : jsonEnv;
      // Some CI/CD systems (or manual copy/paste) may escape newlines in private_key as '\n'.
      if (cred.private_key && typeof cred.private_key === 'string') {
        cred.private_key = cred.private_key.replace(/\\n/g, '\n');
      }

      client = new TextToSpeechClient({
        credentials: {
          client_email: cred.client_email,
          private_key: cred.private_key,
        },
        projectId: cred.project_id ?? projectId,
      });
      console.log('Google TTS client initialized from GOOGLE_APPLICATION_CREDENTIALS_JSON');
      return;
    } catch (err) {
      console.warn('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON, falling back to ADC', err);
      // fallthrough to ADC
    }
  }

  try {
    client = new TextToSpeechClient();
    console.log('Google TTS client initialized via application default credentials');
  } catch (err) {
    console.warn('Google TTS client not initialized. Make sure @google-cloud/text-to-speech is installed and credentials are set.', err);
    client = null;
  }
}

export async function synthesizeSpeech(text: string, opts: SynthesizeOptions = {}): Promise<Buffer> {
  initClientFromEnv();

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
