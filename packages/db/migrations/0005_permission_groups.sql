-- Migration: 0005_permission_groups
-- Creates permission_groups and user_permission_groups tables.
-- Named permission sets that can be assigned to multiple users.

CREATE TABLE IF NOT EXISTS permission_groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',  -- JSON array of Permission strings
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_permission_groups (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  assigned_at TEXT DEFAULT (datetime('now')),
  assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_upg_user  ON user_permission_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_upg_group ON user_permission_groups(group_id);
