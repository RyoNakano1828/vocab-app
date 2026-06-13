-- migrations/20260613_0004_rls.sql
-- Row Level Security policies for MVP: ensure users can only access their own rows
-- Run after tables are created

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------
-- users table policies
-- --------------------------------------------------
-- Allow users to SELECT their own profile (auth_id matches)
CREATE POLICY users_select_self ON users
  FOR SELECT
  USING (auth_id = auth.uid());

-- Allow users to INSERT only when auth_id is their own
CREATE POLICY users_insert_self ON users
  FOR INSERT
  WITH CHECK (auth_id = auth.uid());

-- Allow users to UPDATE only their own profile
CREATE POLICY users_update_self ON users
  FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Allow users to DELETE their own profile (optional)
CREATE POLICY users_delete_self ON users
  FOR DELETE
  USING (auth_id = auth.uid());

-- --------------------------------------------------
-- words table policies
-- --------------------------------------------------
-- Allow a user to SELECT words that they own
CREATE POLICY words_select_owner ON words
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = words.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

-- Allow a user to INSERT words only for themselves (user_id must map to auth.uid())
CREATE POLICY words_insert_owner ON words
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = words.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

-- Allow a user to UPDATE words they own; ensure user_id stays owned by them
CREATE POLICY words_update_owner ON words
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = words.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = NEW.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

-- Allow a user to DELETE words they own
CREATE POLICY words_delete_owner ON words
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = words.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

-- --------------------------------------------------
-- examples table policies
-- --------------------------------------------------
-- Allow a user to SELECT examples they own
CREATE POLICY examples_select_owner ON examples
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = examples.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

-- Allow INSERT only when examples.user_id maps to auth.uid() and the referenced word belongs to the same user
CREATE POLICY examples_insert_owner ON examples
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = NEW.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM words w
      WHERE w.id = NEW.word_id AND w.user_id = NEW.user_id AND w.deleted_at IS NULL
    )
  );

-- Allow UPDATE only by owner; ensure word_id still points to a word owned by the user
CREATE POLICY examples_update_owner ON examples
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = examples.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = NEW.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM words w
      WHERE w.id = NEW.word_id AND w.user_id = NEW.user_id AND w.deleted_at IS NULL
    )
  );

-- Allow DELETE by owner
CREATE POLICY examples_delete_owner ON examples
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = examples.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

-- --------------------------------------------------
-- uploads table policies
-- --------------------------------------------------
-- Allow users to SELECT their uploads
CREATE POLICY uploads_select_owner ON uploads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = uploads.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

-- Allow INSERT when user_id maps to auth.uid()
CREATE POLICY uploads_insert_owner ON uploads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = NEW.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

-- Allow UPDATE/DELETE by owner
CREATE POLICY uploads_update_owner ON uploads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = uploads.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = NEW.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

CREATE POLICY uploads_delete_owner ON uploads
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = uploads.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

-- --------------------------------------------------
-- user_progress table policies
-- --------------------------------------------------
-- Allow users to SELECT their own progress
CREATE POLICY user_progress_select_owner ON user_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_progress.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

-- Allow INSERT only for self and ensure referenced word belongs to the user
CREATE POLICY user_progress_insert_owner ON user_progress
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = NEW.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM words w
      WHERE w.id = NEW.word_id AND w.user_id = NEW.user_id AND w.deleted_at IS NULL
    )
  );

-- Allow UPDATE only by owner
CREATE POLICY user_progress_update_owner ON user_progress
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_progress.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = NEW.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM words w
      WHERE w.id = NEW.word_id AND w.user_id = NEW.user_id AND w.deleted_at IS NULL
    )
  );

-- Allow DELETE by owner
CREATE POLICY user_progress_delete_owner ON user_progress
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_progress.user_id AND u.auth_id = auth.uid() AND u.deleted_at IS NULL
    )
  );

-- End of RLS policies
