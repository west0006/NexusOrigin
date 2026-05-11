// ─── client/src/main/database/index.ts ────────────────────
import Database from 'better-sqlite3';
import { join } from 'path';
import { app } from 'electron';

const DB_PATH = join(app.getPath('userData'), 'shrimp.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 初始化表
db.exec(`
  CREATE TABLE IF NOT EXISTS token_usage (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost_usd REAL NOT NULL,
    skill_id TEXT
  );
  
  CREATE TABLE IF NOT EXISTS budget (
    id TEXT PRIMARY KEY DEFAULT 'default',
    monthly_budget REAL NOT NULL,
    alert_threshold REAL NOT NULL
  );
`);

export default db;