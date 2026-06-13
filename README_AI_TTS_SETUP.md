Update README: add instructions to install dependencies and environment variables for AI/TTS

# AI & TTS Setup

This project integrates Google Gemini (Generative) API and Google Cloud Text-to-Speech for AI-generated example sentences and audio.

Install the Google Cloud Text-to-Speech client library:

npm install @google-cloud/text-to-speech

Environment variables required for full integration:

- GEMINI_API_KEY: API key or bearer token for calling Google Generative API (Gemini).
- GEMINI_MODEL (optional): Model name (default: gemini-2.5-flash-lite)
- GEMINI_API_URL (optional): Override Gemini API URL if needed.
- GOOGLE_APPLICATION_CREDENTIALS: Path to Google service account JSON key for TTS, or configure application-default credentials.
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Notes:
- If GEMINI_API_KEY or Google credentials are not present, the code falls back to safe mocks so development can continue without valid keys.
