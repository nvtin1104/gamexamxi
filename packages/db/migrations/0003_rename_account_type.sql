-- Migration: 0003_rename_account_type
-- Renames column account_type → account in users table

-- SQLite doesn't support RENAME COLUMN before 3.25.0, but D1 supports it.
-- We use a safe approach: add new column, copy data, drop old column.

-- Add new column
ALTER TABLE users ADD COLUMN account TEXT NOT NULL DEFAULT 'standard';

-- Copy data from old column
UPDATE users SET account = account_type WHERE account_type IS NOT NULL;

-- Drop old column (requires SQLite >= 3.35.0 / D1 supports this)
ALTER TABLE users DROP COLUMN account_type;
