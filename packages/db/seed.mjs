#!/usr/bin/env node
/**
 * Seed script for GameXamXi local D1 database.
 * Uses Node.js built-in crypto.scryptSync (same algorithm as @noble/hashes scrypt).
 *
 * Run:  pnpm db:seed:local
 * Remote: pnpm db:seed:remote  (add --remote flag)
 *
 * Credentials seeded:
 *   root@gamexamxi.com    / Root@12345   (role: root)
 *   admin@gamexamxi.com   / Admin@12345  (role: admin)
 *   mod@gamexamxi.com     / Test@12345   (role: moderator)
 *   alice@example.com     / Test@12345
 *   bob@example.com       / Test@12345
 *   charlie@example.com   / Test@12345
 *   diana@example.com     / Test@12345
 *   ethan@example.com     / Test@12345
 *   fiona@example.com     / Test@12345
 */

import { execSync } from 'node:child_process'
import { scryptSync, randomBytes } from 'node:crypto'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REMOTE = process.argv.includes('--remote')
const WRANGLER_CONFIG = join(__dirname, '../../apps/worker/wrangler.json')
const DB_NAME = 'gamexamxi-db'
const FLAG = REMOTE ? '--remote' : '--local'

// ─── Helpers ──────────────────────────────────────────────────

/** Same params as apps/worker/src/lib/auth.ts */
function hashPassword(password) {
  const salt = randomBytes(16)
  const saltHex = salt.toString('hex')
  const hash = scryptSync(password, salt, 32, {
    N: 16384, r: 8, p: 1,
    maxmem: 256 * 1024 * 1024,
  })
  return `${saltHex}:${hash.toString('hex')}`
}

function sq(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? '1' : '0'
  return `'${String(v).replace(/'/g, "''")}'`
}

function uuid() {
  return crypto.randomUUID()
}

function runSQL(sql, label) {
  const tmp = join(tmpdir(), `gamexamxi-seed-${Date.now()}.sql`)
  try {
    writeFileSync(tmp, sql, 'utf8')
    if (label) process.stdout.write(`  ${label}... `)
    execSync(
      `wrangler d1 execute ${DB_NAME} ${FLAG} --config "${WRANGLER_CONFIG}" --file "${tmp}"`,
      { stdio: 'pipe', cwd: __dirname }
    )
    if (label) console.log('✅')
  } catch (err) {
    if (label) console.log('❌')
    console.error(err.stderr?.toString() ?? err.message)
    process.exit(1)
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp)
  }
}

// ─── IDs ──────────────────────────────────────────────────────

const IDS = {
  // Users
  root:     uuid(),
  admin:    uuid(),
  mod:      uuid(),
  alice:    uuid(),
  bob:      uuid(),
  charlie:  uuid(),
  diana:    uuid(),
  ethan:    uuid(),
  fiona:    uuid(),

  // Groups
  groupFriends: uuid(),
  groupCouple:  uuid(),
  groupFamily:  uuid(),

  // Events
  ev1: uuid(), ev2: uuid(), ev3: uuid(),
  ev4: uuid(), ev5: uuid(), ev6: uuid(),

  // Achievements (same as migration 0001 seed)
  ach_first_pred: uuid(),
  ach_ten_pred:   uuid(),
  ach_fifty_pred: uuid(),
  ach_streak7:    uuid(),
  ach_streak30:   uuid(),
  ach_first_win:  uuid(),
  ach_ten_wins:   uuid(),
  ach_group_creator:    uuid(),
  ach_social_butterfly: uuid(),
}

// ─── Step 1: Clear ───────────────────────────────────────────

const clearSQL = `
DELETE FROM quest_completions;
DELETE FROM group_quests;
DELETE FROM group_members;
DELETE FROM predictions;
DELETE FROM prediction_events;
DELETE FROM user_achievements;
DELETE FROM user_items;
DELETE FROM experience_transactions;
DELETE FROM level_up_transactions;
DELETE FROM point_transactions;
DELETE FROM groups;
DELETE FROM users;
DELETE FROM achievements;
DELETE FROM shop_items;
`

// ─── Step 2: Users ────────────────────────────────────────────

const rootPwd   = hashPassword('Root@12345')
const adminPwd  = hashPassword('Admin@12345')
const testPwd   = hashPassword('Test@12345')

const usersSQL = `
INSERT INTO users (id, username, name, email, password, bio, role, account, status,
  experience, level, points, total_points_earned, login_streak, last_login_at, created_at) VALUES
(${sq(IDS.root)}, 'root', 'Root Admin', 'root@gamexamxi.com', ${sq(rootPwd)},
 'System root administrator', 'root', 'premium', 'active',
 99999, 99, 999999, 999999, 365, datetime('now','-1 day'), datetime('now','-365 day')),

(${sq(IDS.admin)}, 'admin', 'Super Admin', 'admin@gamexamxi.com', ${sq(adminPwd)},
 'Platform administrator', 'admin', 'premium', 'active',
 9800, 12, 15000, 20000, 30, datetime('now','-1 day'), datetime('now','-60 day')),

(${sq(IDS.mod)}, 'moderator', 'Mod Vinh', 'mod@gamexamxi.com', ${sq(testPwd)},
 'Community moderator', 'moderator', 'premium', 'active',
 3000, 8, 5000, 8000, 14, datetime('now','-1 day'), datetime('now','-45 day')),

(${sq(IDS.alice)}, 'alice', 'Alice Nguyen', 'alice@example.com', ${sq(testPwd)},
 'Prediction enthusiast 🔮', 'user', 'standard', 'active',
 1400, 6, 2800, 4500, 7, datetime('now','-1 day'), datetime('now','-30 day')),

(${sq(IDS.bob)}, 'bob', 'Bob Tran', 'bob@example.com', ${sq(testPwd)},
 'Casual gamer', 'user', 'standard', 'active',
 900, 5, 1500, 2200, 5, datetime('now','-2 day'), datetime('now','-20 day')),

(${sq(IDS.charlie)}, 'charlie', 'Charlie Le', 'charlie@example.com', ${sq(testPwd)},
 'Sports fan & predictor', 'user', 'premium', 'active',
 2100, 7, 4200, 6000, 10, datetime('now','-1 day'), datetime('now','-25 day')),

(${sq(IDS.diana)}, 'diana', 'Diana Pham', 'diana@example.com', ${sq(testPwd)},
 'Data-driven predictions only', 'user', 'standard', 'active',
 500, 4, 800, 1200, 3, datetime('now','-3 day'), datetime('now','-15 day')),

(${sq(IDS.ethan)}, 'ethan', 'Ethan Vo', 'ethan@example.com', ${sq(testPwd)},
 'Just here for fun', 'user', 'standard', 'active',
 250, 3, 400, 600, 2, datetime('now','-5 day'), datetime('now','-10 day')),

(${sq(IDS.fiona)}, 'fiona', 'Fiona Ho', 'fiona@example.com', ${sq(testPwd)},
 'New to predictions!', 'user', 'standard', 'active',
 100, 2, 200, 300, 1, datetime('now','-7 day'), datetime('now','-5 day'));
`

// ─── Step 3: Achievements ─────────────────────────────────────

const achievementsSQL = `
INSERT OR IGNORE INTO achievements (id, code, name, description, badge_rarity, point_reward, condition) VALUES
(${sq(IDS.ach_first_pred)},  'FIRST_PREDICTION',   'Rookie Prophet',       'Make your first prediction',     'COMMON',    10,  '{"type":"prediction_count","count":1}'),
(${sq(IDS.ach_ten_pred)},    'TEN_PREDICTIONS',    'Prophet in Training',  'Make 10 predictions',             'COMMON',    25,  '{"type":"prediction_count","count":10}'),
(${sq(IDS.ach_fifty_pred)},  'FIFTY_PREDICTIONS',  'Seasoned Prophet',     'Make 50 predictions',             'RARE',      100, '{"type":"prediction_count","count":50}'),
(${sq(IDS.ach_streak7)},     'STREAK_7',           'Week Warrior',         'Login for 7 days in a row',       'RARE',      50,  '{"type":"login_streak","count":7}'),
(${sq(IDS.ach_streak30)},    'STREAK_30',          'Month Master',         'Login for 30 days in a row',      'EPIC',      200, '{"type":"login_streak","count":30}'),
(${sq(IDS.ach_first_win)},   'FIRST_WIN',          'Beginner''s Luck',     'Win your first prediction',       'COMMON',    20,  '{"type":"win_count","count":1}'),
(${sq(IDS.ach_ten_wins)},    'TEN_WINS',           'Reliable Oracle',      'Win 10 predictions',              'RARE',      75,  '{"type":"win_count","count":10}'),
(${sq(IDS.ach_group_creator)},'GROUP_CREATOR',     'Community Builder',    'Create a group',                  'COMMON',    30,  '{"type":"group_created","count":1}'),
(${sq(IDS.ach_social_butterfly)},'SOCIAL_BUTTERFLY','Social Butterfly',    'Join 3 groups',                   'RARE',      50,  '{"type":"group_joined","count":3}');
`

// ─── Step 4: Shop Items ───────────────────────────────────────

const shopSQL = `
INSERT OR IGNORE INTO shop_items (id, name, description, category, price, is_active, metadata) VALUES
(${sq(uuid())}, 'Golden Frame',    'Shiny golden avatar frame',       'AVATAR_FRAME', 500,  1, '{"rarity":"rare"}'),
(${sq(uuid())}, 'Neon Frame',      'Electric neon avatar frame',      'AVATAR_FRAME', 300,  1, '{"rarity":"common"}'),
(${sq(uuid())}, 'Diamond Frame',   'Exclusive diamond avatar frame',  'AVATAR_FRAME', 1500, 1, '{"rarity":"legendary","limited":true}'),
(${sq(uuid())}, 'Prophet Badge',   'Show off your prediction skills', 'BADGE',        200,  1, '{"rarity":"common"}'),
(${sq(uuid())}, 'Oracle Badge',    'Elite prediction badge',          'BADGE',        1000, 1, '{"rarity":"epic"}'),
(${sq(uuid())}, 'Legendary Seer',  'For the true prediction masters', 'BADGE',        5000, 1, '{"rarity":"legendary"}'),
(${sq(uuid())}, 'Dark Theme',      'Dark mode for your profile',      'THEME',        150,  1, '{"theme":"dark"}'),
(${sq(uuid())}, 'Retro Theme',     'Retro brutalist theme',           'THEME',        250,  1, '{"theme":"retro"}'),
(${sq(uuid())}, 'Neon Theme',      'Electric neon theme',             'THEME',        400,  1, '{"theme":"neon"}'),
(${sq(uuid())}, 'XP Boost 2x',     '2x XP for 24 hours',             'BOOST',        300,  1, '{"multiplier":2,"duration_hours":24}'),
(${sq(uuid())}, 'XP Boost 3x',     '3x XP for 6 hours',              'BOOST',        500,  1, '{"multiplier":3,"duration_hours":6}');
`

// ─── Step 5: Groups ───────────────────────────────────────────

const groupsSQL = `
INSERT INTO groups (id, name, description, style, invite_code, is_private, created_by, created_at) VALUES
(${sq(IDS.groupFriends)}, 'The Predictors', 'A group of friends who love predicting outcomes',
 'FRIENDS', 'PRED2026', 0, ${sq(IDS.alice)}, datetime('now','-25 day')),

(${sq(IDS.groupCouple)}, 'Power Couple', 'Alice & Charlie competing in predictions',
 'COUPLE', 'PWRCP26', 1, ${sq(IDS.charlie)}, datetime('now','-15 day')),

(${sq(IDS.groupFamily)}, 'Tran Family League', 'Family prediction championship',
 'FAMILY', 'TRFAM26', 1, ${sq(IDS.bob)}, datetime('now','-10 day'));

INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES
-- The Predictors
(${sq(uuid())}, ${sq(IDS.groupFriends)}, ${sq(IDS.alice)},   'OWNER',  datetime('now','-25 day')),
(${sq(uuid())}, ${sq(IDS.groupFriends)}, ${sq(IDS.bob)},     'ADMIN',  datetime('now','-24 day')),
(${sq(uuid())}, ${sq(IDS.groupFriends)}, ${sq(IDS.charlie)}, 'MEMBER', datetime('now','-20 day')),
(${sq(uuid())}, ${sq(IDS.groupFriends)}, ${sq(IDS.diana)},   'MEMBER', datetime('now','-18 day')),
(${sq(uuid())}, ${sq(IDS.groupFriends)}, ${sq(IDS.ethan)},   'MEMBER', datetime('now','-15 day')),
-- Power Couple
(${sq(uuid())}, ${sq(IDS.groupCouple)}, ${sq(IDS.charlie)}, 'OWNER',  datetime('now','-15 day')),
(${sq(uuid())}, ${sq(IDS.groupCouple)}, ${sq(IDS.alice)},   'MEMBER', datetime('now','-14 day')),
-- Tran Family League
(${sq(uuid())}, ${sq(IDS.groupFamily)}, ${sq(IDS.bob)},    'OWNER',  datetime('now','-10 day')),
(${sq(uuid())}, ${sq(IDS.groupFamily)}, ${sq(IDS.fiona)},  'MEMBER', datetime('now','-9 day'));
`

// ─── Step 6: Group Quests ─────────────────────────────────────

const questsSQL = `
INSERT INTO group_quests (id, group_id, created_by, title, description, point_reward, status, deadline, created_at) VALUES
(${sq(uuid())}, ${sq(IDS.groupFriends)}, ${sq(IDS.alice)},
 'First to 5 Wins', 'First member to get 5 correct predictions wins the quest', 200, 'ACTIVE',
 datetime('now','+7 day'), datetime('now','-5 day')),

(${sq(uuid())}, ${sq(IDS.groupFriends)}, ${sq(IDS.bob)},
 'Weekend Prediction Marathon', 'Make at least 3 predictions this weekend', 100, 'ACTIVE',
 datetime('now','+2 day'), datetime('now','-1 day')),

(${sq(uuid())}, ${sq(IDS.groupFamily)}, ${sq(IDS.bob)},
 'Family Streak Challenge', 'Everyone logs in 3 days in a row', 150, 'ACTIVE',
 datetime('now','+5 day'), datetime('now','-2 day'));
`

// ─── Step 7: Prediction Events ────────────────────────────────

const now = new Date()
const tomorrow   = new Date(now); tomorrow.setDate(now.getDate() + 1)
const nextWeek   = new Date(now); nextWeek.setDate(now.getDate() + 7)
const yesterday  = new Date(now); yesterday.setDate(now.getDate() - 1)
const lastWeek   = new Date(now); lastWeek.setDate(now.getDate() - 7)

const dt = (d) => d.toISOString().replace('T', ' ').slice(0, 19)

const eventsSQL = `
INSERT INTO prediction_events
  (id, creator_id, group_id, title, description, type, options, point_reward, bonus_multiplier,
   predict_deadline, resolve_at, correct_answer, status, is_public, created_at) VALUES

-- OPEN public events
(${sq(IDS.ev1)}, ${sq(IDS.admin)}, NULL,
 'Vô địch AFF Cup 2026?', 'Đội nào sẽ vô địch AFF Cup 2026?',
 'BINARY', '["Việt Nam","Thái Lan"]', 150, 1.5,
 ${sq(dt(nextWeek))}, NULL, NULL, 'OPEN', 1, datetime('now','-3 day')),

(${sq(IDS.ev2)}, ${sq(IDS.admin)}, NULL,
 'Bitcoin cuối tháng 3/2026?', 'BTC sẽ trên hay dưới 100,000 USD vào 31/3?',
 'BINARY', '["Trên $100k","Dưới $100k"]', 200, 2.0,
 ${sq(dt(nextWeek))}, NULL, NULL, 'OPEN', 1, datetime('now','-2 day')),

(${sq(IDS.ev3)}, ${sq(IDS.alice)}, ${sq(IDS.groupFriends)},
 'Ai sẽ thắng vòng này?', 'Dự đoán người thắng tuần này trong nhóm',
 'POLL', '["Alice","Bob","Charlie","Diana","Ethan"]', 100, 1.0,
 ${sq(dt(tomorrow))}, NULL, NULL, 'OPEN', 0, datetime('now','-1 day')),

-- LOCKED event
(${sq(IDS.ev4)}, ${sq(IDS.mod)}, NULL,
 'Champions League 2026 Winner?', 'Which team wins UCL 2026?',
 'POLL', '["Real Madrid","Man City","Bayern","PSG","Arsenal"]', 300, 2.5,
 ${sq(dt(yesterday))}, ${sq(dt(nextWeek))}, NULL, 'LOCKED', 1, datetime('now','-10 day')),

-- RESOLVED events
(${sq(IDS.ev5)}, ${sq(IDS.admin)}, NULL,
 'Tỷ giá USD/VND tuần qua?', 'USD/VND sẽ tăng hay giảm trong tuần?',
 'BINARY', '["Tăng","Giảm"]', 100, 1.0,
 ${sq(dt(lastWeek))}, ${sq(dt(yesterday))}, '"Tăng"', 'RESOLVED', 1, datetime('now','-14 day')),

(${sq(IDS.ev6)}, ${sq(IDS.charlie)}, ${sq(IDS.groupFriends)},
 'Kết quả trận derby?', 'Dự đoán kết quả trận derby tuần trước',
 'BINARY', '["Đội A thắng","Đội B thắng","Hòa"]', 150, 1.2,
 ${sq(dt(lastWeek))}, ${sq(dt(yesterday))}, '"Đội A thắng"', 'RESOLVED', 0, datetime('now','-12 day'));
`

// ─── Step 8: Predictions ──────────────────────────────────────

const predictionsSQL = `
INSERT INTO predictions (id, user_id, event_id, answer, is_correct, points_earned, created_at) VALUES
-- ev1 (OPEN: AFF Cup)
(${sq(uuid())}, ${sq(IDS.alice)},   ${sq(IDS.ev1)}, '"Việt Nam"', NULL, 0, datetime('now','-2 day')),
(${sq(uuid())}, ${sq(IDS.bob)},     ${sq(IDS.ev1)}, '"Thái Lan"', NULL, 0, datetime('now','-2 day')),
(${sq(uuid())}, ${sq(IDS.charlie)}, ${sq(IDS.ev1)}, '"Việt Nam"', NULL, 0, datetime('now','-1 day')),

-- ev2 (OPEN: Bitcoin)
(${sq(uuid())}, ${sq(IDS.alice)},   ${sq(IDS.ev2)}, '"Trên $100k"', NULL, 0, datetime('now','-1 day')),
(${sq(uuid())}, ${sq(IDS.charlie)}, ${sq(IDS.ev2)}, '"Dưới $100k"', NULL, 0, datetime('now','-1 day')),

-- ev4 (LOCKED: UCL)
(${sq(uuid())}, ${sq(IDS.alice)},   ${sq(IDS.ev4)}, '"Real Madrid"',  NULL, 0, datetime('now','-5 day')),
(${sq(uuid())}, ${sq(IDS.bob)},     ${sq(IDS.ev4)}, '"Man City"',     NULL, 0, datetime('now','-4 day')),
(${sq(uuid())}, ${sq(IDS.charlie)}, ${sq(IDS.ev4)}, '"Arsenal"',      NULL, 0, datetime('now','-3 day')),
(${sq(uuid())}, ${sq(IDS.diana)},   ${sq(IDS.ev4)}, '"Bayern"',       NULL, 0, datetime('now','-3 day')),

-- ev5 (RESOLVED: USD/VND — correct_answer = "Tăng")
(${sq(uuid())}, ${sq(IDS.alice)},   ${sq(IDS.ev5)}, '"Tăng"',  1, 100, datetime('now','-8 day')),
(${sq(uuid())}, ${sq(IDS.bob)},     ${sq(IDS.ev5)}, '"Giảm"',  0, 0,   datetime('now','-8 day')),
(${sq(uuid())}, ${sq(IDS.charlie)}, ${sq(IDS.ev5)}, '"Tăng"',  1, 100, datetime('now','-7 day')),
(${sq(uuid())}, ${sq(IDS.diana)},   ${sq(IDS.ev5)}, '"Giảm"',  0, 0,   datetime('now','-7 day')),

-- ev6 (RESOLVED: Derby — correct_answer = "Đội A thắng")
(${sq(uuid())}, ${sq(IDS.alice)},   ${sq(IDS.ev6)}, '"Đội A thắng"', 1, 150, datetime('now','-9 day')),
(${sq(uuid())}, ${sq(IDS.charlie)}, ${sq(IDS.ev6)}, '"Đội B thắng"', 0, 0,   datetime('now','-9 day'));
`

// ─── Step 9: User Achievements ────────────────────────────────

const userAchievementsSQL = `
INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at) VALUES
-- Alice: first prediction, first win, streak 7
(${sq(uuid())}, ${sq(IDS.alice)}, ${sq(IDS.ach_first_pred)}, datetime('now','-28 day')),
(${sq(uuid())}, ${sq(IDS.alice)}, ${sq(IDS.ach_first_win)},  datetime('now','-8 day')),
(${sq(uuid())}, ${sq(IDS.alice)}, ${sq(IDS.ach_streak7)},    datetime('now','-20 day')),
(${sq(uuid())}, ${sq(IDS.alice)}, ${sq(IDS.ach_group_creator)}, datetime('now','-25 day')),
-- Charlie
(${sq(uuid())}, ${sq(IDS.charlie)}, ${sq(IDS.ach_first_pred)}, datetime('now','-20 day')),
(${sq(uuid())}, ${sq(IDS.charlie)}, ${sq(IDS.ach_first_win)},  datetime('now','-7 day')),
(${sq(uuid())}, ${sq(IDS.charlie)}, ${sq(IDS.ach_group_creator)}, datetime('now','-15 day')),
-- Admin
(${sq(uuid())}, ${sq(IDS.admin)}, ${sq(IDS.ach_streak30)},   datetime('now','-5 day')),
(${sq(uuid())}, ${sq(IDS.admin)}, ${sq(IDS.ach_ten_wins)},   datetime('now','-10 day')),
-- Root
(${sq(uuid())}, ${sq(IDS.root)}, ${sq(IDS.ach_streak30)},    datetime('now','-300 day')),
(${sq(uuid())}, ${sq(IDS.root)}, ${sq(IDS.ach_fifty_pred)},  datetime('now','-300 day')),
(${sq(uuid())}, ${sq(IDS.root)}, ${sq(IDS.ach_ten_wins)},    datetime('now','-300 day'));
`

// ─── Step 10: Point Transactions ─────────────────────────────

const txSQL = `
INSERT INTO point_transactions
  (id, user_id, amount, type, balance_after, description, created_at) VALUES
(${sq(uuid())}, ${sq(IDS.alice)},   100,  'WELCOME_BONUS',  100,  'Welcome to GameXamXi!', datetime('now','-30 day')),
(${sq(uuid())}, ${sq(IDS.alice)},   10,   'LOGIN_STREAK',   110,  'Day 1 streak bonus',    datetime('now','-29 day')),
(${sq(uuid())}, ${sq(IDS.alice)},   100,  'PREDICTION_WIN', 210,  NULL,                    datetime('now','-8 day')),
(${sq(uuid())}, ${sq(IDS.alice)},   150,  'PREDICTION_WIN', 360,  NULL,                    datetime('now','-7 day')),

(${sq(uuid())}, ${sq(IDS.bob)},     100,  'WELCOME_BONUS',  100,  'Welcome to GameXamXi!', datetime('now','-20 day')),
(${sq(uuid())}, ${sq(IDS.bob)},     10,   'LOGIN_STREAK',   110,  'Day 1 streak bonus',    datetime('now','-19 day')),

(${sq(uuid())}, ${sq(IDS.charlie)}, 100,  'WELCOME_BONUS',  100,  'Welcome to GameXamXi!', datetime('now','-25 day')),
(${sq(uuid())}, ${sq(IDS.charlie)}, 100,  'PREDICTION_WIN', 200,  NULL,                    datetime('now','-8 day')),

(${sq(uuid())}, ${sq(IDS.admin)},   1000, 'ADMIN_GRANT',    1000, 'Admin seed points',     datetime('now','-60 day')),
(${sq(uuid())}, ${sq(IDS.root)},    9999, 'ADMIN_GRANT',    9999, 'Root seed points',      datetime('now','-365 day'));
`

// ─── Run ──────────────────────────────────────────────────────

console.log(`\n🌱 GameXamXi Seed (${REMOTE ? 'REMOTE 🌐' : 'LOCAL 💻'})\n`)

runSQL(clearSQL,            '1/9 Clearing existing data')
runSQL(usersSQL,            '2/9 Inserting users')
runSQL(achievementsSQL,     '3/9 Inserting achievements')
runSQL(shopSQL,             '4/9 Inserting shop items')
runSQL(groupsSQL,           '5/9 Inserting groups & members')
runSQL(questsSQL,           '6/9 Inserting group quests')
runSQL(eventsSQL,           '7/9 Inserting prediction events')
runSQL(predictionsSQL,      '8/9 Inserting predictions')
runSQL(userAchievementsSQL, '9/9 Inserting user achievements')
runSQL(txSQL,               '+ Point transactions')

console.log(`
✅ Seed complete!

Accounts (password in parens):
  root@gamexamxi.com    (Root@12345)  — role: root
  admin@gamexamxi.com   (Admin@12345) — role: admin
  mod@gamexamxi.com     (Test@12345)  — role: moderator
  alice@example.com     (Test@12345)
  bob@example.com       (Test@12345)
  charlie@example.com   (Test@12345)
  diana@example.com     (Test@12345)
  ethan@example.com     (Test@12345)
  fiona@example.com     (Test@12345)
`)
