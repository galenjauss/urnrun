-- Urn Run initial schema (SPEC §6.3). Answers live only here (server-side), never in the client bundle.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  display_name TEXT,
  discord_id TEXT UNIQUE,
  steam_id TEXT UNIQUE,
  friend_code TEXT UNIQUE,
  settings_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('heroes','items','lore','community')),
  text TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 2,
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE prompt_answers (
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  answer_id TEXT NOT NULL,
  display TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  seed_tier TEXT NOT NULL CHECK (seed_tier IN ('trooper','wise_guy','guardian','walker','mid_boss','rejuvenator')),
  locked INTEGER NOT NULL DEFAULT 0,
  is_rejuv INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (prompt_id, answer_id)
);

CREATE TABLE prompt_why_nots (
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  guess TEXT NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY (prompt_id, guess)
);

CREATE TABLE daily_schedule (
  day INTEGER PRIMARY KEY,
  prompt_ids_json TEXT NOT NULL,
  published_at INTEGER NOT NULL
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  mode TEXT NOT NULL CHECK (mode IN ('daily','free','archive','lobby')),
  day INTEGER,
  prompt_ids_json TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  total_souls INTEGER NOT NULL DEFAULT 0,
  depth_zone TEXT,
  flagged INTEGER NOT NULL DEFAULT 0,
  client_meta_json TEXT NOT NULL DEFAULT '{}'
);
-- One scored Daily per user per day.
CREATE UNIQUE INDEX runs_one_daily ON runs (user_id, day) WHERE mode = 'daily';
CREATE INDEX runs_day_total ON runs (mode, day, finished_at, total_souls);

CREATE TABLE run_rounds (
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  prompt_id TEXT NOT NULL,
  answer_id TEXT,
  tier TEXT,
  souls INTEGER NOT NULL DEFAULT 0,
  served_at INTEGER,
  answered_at INTEGER,
  guesses INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','open','answered','expired')),
  PRIMARY KEY (run_id, idx)
);

CREATE TABLE answer_tallies (
  day INTEGER NOT NULL,
  prompt_id TEXT NOT NULL,
  answer_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, prompt_id, answer_id)
);

CREATE TABLE rarity_tables (
  prompt_id TEXT PRIMARY KEY,
  computed_at INTEGER NOT NULL,
  sample INTEGER NOT NULL,
  table_json TEXT NOT NULL
);

CREATE TABLE streaks (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  current INTEGER NOT NULL DEFAULT 0,
  best INTEGER NOT NULL DEFAULT 0,
  last_day INTEGER,
  freezes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE friends (
  user_id TEXT NOT NULL REFERENCES users(id),
  friend_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE flags (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','rejected'))
);

CREATE TABLE badges (
  user_id TEXT NOT NULL REFERENCES users(id),
  badge_id TEXT NOT NULL,
  earned_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, badge_id)
);
