-- Migration: 0001_init_schema
-- Created: 2026-02-25
-- Full schema for Minigame Prediction Platform

-- Drop old template table if exists
DROP TABLE IF EXISTS comments;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  avatar_url TEXT,
  bio TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  login_streak INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Point Transactions
CREATE TABLE IF NOT EXISTS point_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference_id TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT,
  unlocked_at TEXT DEFAULT (datetime('now'))
);

-- User Items (shop purchases)
CREATE TABLE IF NOT EXISTS user_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  purchased_at TEXT DEFAULT (datetime('now')),
  equipped_at TEXT
);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  style TEXT NOT NULL,
  avatar_url TEXT,
  cover_url TEXT,
  invite_code TEXT UNIQUE,
  is_private INTEGER NOT NULL DEFAULT 0,
  settings TEXT NOT NULL DEFAULT '{}',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Group Members
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  nickname TEXT,
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(group_id, user_id)
);

-- Group Quests
CREATE TABLE IF NOT EXISTS group_quests (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  point_reward INTEGER DEFAULT 50,
  assigned_to TEXT,
  deadline TEXT,
  condition TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Quest Completions
CREATE TABLE IF NOT EXISTS quest_completions (
  id TEXT PRIMARY KEY NOT NULL,
  quest_id TEXT NOT NULL REFERENCES group_quests(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TEXT DEFAULT (datetime('now')),
  UNIQUE(quest_id, user_id)
);

-- Prediction Events
CREATE TABLE IF NOT EXISTS prediction_events (
  id TEXT PRIMARY KEY NOT NULL,
  creator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  options TEXT NOT NULL,
  point_reward INTEGER NOT NULL DEFAULT 100,
  bonus_multiplier REAL NOT NULL DEFAULT 1.0,
  predict_deadline TEXT NOT NULL,
  resolve_at TEXT,
  correct_answer TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Predictions
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES prediction_events(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct INTEGER,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, event_id)
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_rarity TEXT NOT NULL DEFAULT 'COMMON',
  point_reward INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL
);

-- Shop Items
CREATE TABLE IF NOT EXISTS shop_items (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  asset_url TEXT,
  metadata TEXT,
  is_limited INTEGER NOT NULL DEFAULT 0,
  stock INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_point_tx_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_event ON predictions(event_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON prediction_events(status);
CREATE INDEX IF NOT EXISTS idx_events_group ON prediction_events(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_quests_group ON group_quests(group_id);

-- Seed achievements
INSERT OR IGNORE INTO achievements (id, code, name, description, badge_rarity, point_reward, condition) VALUES
  (lower(hex(randomblob(16))), 'FIRST_PREDICTION', 'Rookie Prophet', 'Make your first prediction', 'COMMON', 10, '{"type":"prediction_count","count":1}'),
  (lower(hex(randomblob(16))), 'TEN_PREDICTIONS', 'Prophet in Training', 'Make 10 predictions', 'COMMON', 25, '{"type":"prediction_count","count":10}'),
  (lower(hex(randomblob(16))), 'FIFTY_PREDICTIONS', 'Seasoned Prophet', 'Make 50 predictions', 'RARE', 100, '{"type":"prediction_count","count":50}'),
  (lower(hex(randomblob(16))), 'STREAK_7', 'Week Warrior', 'Login for 7 days in a row', 'RARE', 50, '{"type":"login_streak","count":7}'),
  (lower(hex(randomblob(16))), 'STREAK_30', 'Month Master', 'Login for 30 days in a row', 'EPIC', 200, '{"type":"login_streak","count":30}'),
  (lower(hex(randomblob(16))), 'FIRST_WIN', 'Beginner''s Luck', 'Win your first prediction', 'COMMON', 20, '{"type":"win_count","count":1}'),
  (lower(hex(randomblob(16))), 'TEN_WINS', 'Reliable Oracle', 'Win 10 predictions', 'RARE', 75, '{"type":"win_count","count":10}'),
  (lower(hex(randomblob(16))), 'GROUP_CREATOR', 'Community Builder', 'Create a group', 'COMMON', 30, '{"type":"group_created","count":1}'),
  (lower(hex(randomblob(16))), 'SOCIAL_BUTTERFLY', 'Social Butterfly', 'Join 3 groups', 'RARE', 50, '{"type":"group_joined","count":3}');

-- Seed shop items
INSERT OR IGNORE INTO shop_items (id, name, description, category, price, is_active, metadata) VALUES
  (lower(hex(randomblob(16))), 'Golden Frame', 'Shiny golden avatar frame', 'AVATAR_FRAME', 500, 1, '{"rarity":"rare"}'),
  (lower(hex(randomblob(16))), 'Neon Frame', 'Electric neon avatar frame', 'AVATAR_FRAME', 300, 1, '{"rarity":"common"}'),
  (lower(hex(randomblob(16))), 'Prophet Badge', 'Show off your prediction skills', 'BADGE', 200, 1, '{"rarity":"common"}'),
  (lower(hex(randomblob(16))), 'Oracle Badge', 'Elite prediction badge', 'BADGE', 1000, 1, '{"rarity":"epic"}'),
  (lower(hex(randomblob(16))), 'Dark Theme', 'Dark mode for your profile', 'THEME', 150, 1, '{"theme":"dark"}'),
  (lower(hex(randomblob(16))), 'Retro Theme', 'Retro brutalist theme', 'THEME', 250, 1, '{"theme":"retro"}');
