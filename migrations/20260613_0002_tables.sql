-- migrations/20260613_0002_tables.sql
-- Create tables for MVP with logical deletion (deleted_at)
-- Run second

-- 1) users: application-level user profile table (map to Supabase Auth via auth_id if desired)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE, -- optional mapping to auth.users(id)
  email text,
  display_name text,
  metadata jsonb,
  deleted_at timestamptz, -- logical deletion
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'Application user profiles. Map to Supabase auth.users via auth_id when available. Use deleted_at for logical deletion.';

-- 2) words: owned by user (simple: duplicates allowed across users)
CREATE TABLE IF NOT EXISTS words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word text NOT NULL,
  language varchar(10) NOT NULL DEFAULT 'en',
  meaning jsonb,          -- flexible structure (validate at app layer)
  phonetic text,
  audio_path text,        -- Supabase Storage path for word audio (belongs to user)
  metadata jsonb,
  deleted_at timestamptz, -- logical deletion
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE words IS 'User-owned word entries. Duplicates allowed across different users. Use deleted_at for soft delete.';

-- 3) examples: example sentences; belong to user and reference a word (word_id)
CREATE TABLE IF NOT EXISTS examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  sentence text NOT NULL,
  translation text,
  sentence_audio_path text,  -- Supabase Storage path for sentence audio (belongs to user)
  metadata jsonb,
  deleted_at timestamptz, -- logical deletion
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE examples IS 'User-owned example sentences. Duplicates allowed across different users. Use deleted_at for soft delete.';

-- 4) uploads: track audio files (or other generated/uploaded assets)
CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_path text NOT NULL, -- Supabase Storage object path
  file_name text,
  file_size bigint,
  content_type text,
  metadata jsonb,
  deleted_at timestamptz, -- logical deletion
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE uploads IS 'References to files stored in Supabase Storage. Audio files belong to a user. Use deleted_at for soft delete.';

-- 5) user_progress: per-user progress for each word (unique per user+word)
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  meaning_known boolean NOT NULL DEFAULT false,
  review_count int NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  ease_factor numeric NOT NULL DEFAULT 2.5,
  interval_days int NOT NULL DEFAULT 0,
  repetitions int NOT NULL DEFAULT 0,
  metadata jsonb,
  deleted_at timestamptz, -- logical deletion
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_progress_unique_per_user_word UNIQUE (user_id, word_id)
);

COMMENT ON TABLE user_progress IS 'Per-user spaced-repetition data for words (one row per user+word). Use deleted_at for soft delete.';
