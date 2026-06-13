-- migrations/20260613_0003_indexes_triggers.sql
-- Indexes and simple triggers (run third)

-- -----------------------
-- Indexes
-- -----------------------

-- users
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users (auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE (deleted_at IS NULL);

-- words
CREATE INDEX IF NOT EXISTS idx_words_user_id ON words (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_words_word ON words (word) WHERE (deleted_at IS NULL);

-- examples
CREATE INDEX IF NOT EXISTS idx_examples_user_id ON examples (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_examples_word_id ON examples (word_id) WHERE (deleted_at IS NULL);

-- uploads
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads (user_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_uploads_storage_path ON uploads (storage_path) WHERE (deleted_at IS NULL);

-- user_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress (user_id) WHERE (deleted_at IS NULL);
-- index to efficiently query due items for a user: next_review_at
CREATE INDEX IF NOT EXISTS idx_user_progress_user_next_review ON user_progress (user_id, next_review_at) WHERE (deleted_at IS NULL AND next_review_at IS NOT NULL);

-- -----------------------
-- Trigger function to keep updated_at current
-- -----------------------
CREATE OR REPLACE FUNCTION app_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to tables with updated_at column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgname = 'trg_set_updated_at_users') THEN
    CREATE TRIGGER trg_set_updated_at_users
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION app_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgname = 'trg_set_updated_at_words') THEN
    CREATE TRIGGER trg_set_updated_at_words
      BEFORE UPDATE ON words
      FOR EACH ROW
      EXECUTE FUNCTION app_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgname = 'trg_set_updated_at_examples') THEN
    CREATE TRIGGER trg_set_updated_at_examples
      BEFORE UPDATE ON examples
      FOR EACH ROW
      EXECUTE FUNCTION app_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgname = 'trg_set_updated_at_user_progress') THEN
    CREATE TRIGGER trg_set_updated_at_user_progress
      BEFORE UPDATE ON user_progress
      FOR EACH ROW
      EXECUTE FUNCTION app_set_updated_at();
  END IF;

END$$;

-- -----------------------
-- Optional helper: soft-delete function for a user
-- This sets deleted_at on the user and related child rows.
-- It's convenient for ensuring owned data is logically deleted together.
-- -----------------------
CREATE OR REPLACE FUNCTION soft_delete_user(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE users SET deleted_at = now() WHERE id = p_user_id AND deleted_at IS NULL;
  UPDATE words SET deleted_at = now() WHERE user_id = p_user_id AND deleted_at IS NULL;
  UPDATE examples SET deleted_at = now() WHERE user_id = p_user_id AND deleted_at IS NULL;
  UPDATE uploads SET deleted_at = now() WHERE user_id = p_user_id AND deleted_at IS NULL;
  UPDATE user_progress SET deleted_at = now() WHERE user_id = p_user_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: soft_delete_user is optional convenience; your application can also set deleted_at itself.
