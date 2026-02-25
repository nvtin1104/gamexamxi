-- Migration: 0002_update_users
-- Syncs DB to the new users schema:
--   - rename password_hash → password, avatar_url → avatar
--   - add: name, gg_id, role, account_type, status, suspend_*, experience, level
--   - update point_transactions: add reference_table, balance_after, description
--   - add level_up_transactions and experience_transactions tables

-- ─── users: new columns ───────────────────────────────────────
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN password TEXT;
ALTER TABLE users ADD COLUMN avatar TEXT;
ALTER TABLE users ADD COLUMN gg_id TEXT;
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN suspend_type TEXT;
ALTER TABLE users ADD COLUMN suspend_until TEXT;
ALTER TABLE users ADD COLUMN suspend_reason TEXT;
ALTER TABLE users ADD COLUMN suspend_at TEXT;
ALTER TABLE users ADD COLUMN experience INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 1;

-- Migrate existing password_hash → password, avatar_url → avatar
UPDATE users SET password = password_hash WHERE password IS NULL AND password_hash IS NOT NULL;
UPDATE users SET avatar = avatar_url WHERE avatar IS NULL AND avatar_url IS NOT NULL;

-- Unique index on gg_id (sparse — only for OAuth users)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_gg_id ON users(gg_id) WHERE gg_id IS NOT NULL;

-- ─── point_transactions: new columns ─────────────────────────
ALTER TABLE point_transactions ADD COLUMN reference_table TEXT;
ALTER TABLE point_transactions ADD COLUMN balance_after INTEGER NOT NULL DEFAULT 0;
ALTER TABLE point_transactions ADD COLUMN description TEXT;

-- Migrate note → description
UPDATE point_transactions SET description = note WHERE description IS NULL AND note IS NOT NULL;

-- ─── level_up_transactions (new table) ───────────────────────
CREATE TABLE IF NOT EXISTS level_up_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  old_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,
  experience_gained INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── experience_transactions (new table) ─────────────────────
CREATE TABLE IF NOT EXISTS experience_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference_id TEXT,
  reference_table TEXT,
  balance_after INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_level_up_user ON level_up_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_exp_tx_user ON experience_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
