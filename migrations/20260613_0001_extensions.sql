-- migrations/20260613_0001_extensions.sql
-- Enable required extensions (run first)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Note: pgcrypto provides gen_random_uuid() used for UUID default values.
