const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");

const DATA = path.join(__dirname, "..", "data");
const ON_VERCEL = process.env.VERCEL === "1";
const RUNTIME = ON_VERCEL ? path.join("/tmp", "eptlo") : DATA;

let db;
let moderatorCreated = false;

function init() {
  if (db) return db;
  const file = process.env.DB_PATH || path.join(RUNTIME, "app.sqlite");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL,
      penalty_until TEXT,
      rehab_remaining INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      category TEXT NOT NULL,
      comment TEXT NOT NULL,
      photos TEXT NOT NULL DEFAULT '[]',
      ccaa TEXT NOT NULL,
      provincia TEXT NOT NULL,
      municipio TEXT NOT NULL,
      municipio_code TEXT,
      location_source TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      author_alias TEXT NOT NULL,
      author_user_id INTEGER,
      author_token_hash TEXT,
      created_at TEXT NOT NULL,
      moderated_at TEXT,
      moderator_id INTEGER,
      moderation_note TEXT,
      resolved_at TEXT,
      real_votes INTEGER NOT NULL DEFAULT 0,
      fake_votes INTEGER NOT NULL DEFAULT 0,
      removed_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY,
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      value TEXT NOT NULL,
      voter_lat REAL,
      voter_lng REAL,
      is_rehab INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE (complaint_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS resolve_requests (
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (complaint_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS moderation_log (
      id INTEGER PRIMARY KEY,
      complaint_id INTEGER,
      moderator_id INTEGER,
      action TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS geo_cache (
      cache_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_complaints_place ON complaints (ccaa, provincia, municipio);
    CREATE INDEX IF NOT EXISTS idx_votes_user ON votes (user_id, created_at);
  `);
  seedModerator();
  return db;
}

function seedModerator() {
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get("moderador");
  if (existing) return false;
  db.prepare(
    `INSERT INTO users (username, password_hash, role, created_at)
     VALUES (?, ?, 'moderator', ?)`
  ).run("moderador", bcrypt.hashSync("Pueblo2026!", 10), new Date().toISOString());
  moderatorCreated = true;
  return true;
}

function getDb() {
  return init();
}

function close() {
  if (!db) return;
  db.close();
  db = null;
}

function secret() {
  if (process.env.SECRET) return process.env.SECRET;
  const file = path.join(RUNTIME, "secret.txt");
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const value = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(file, value);
    return value;
  } catch {
    return "eptlo-vercel";
  }
}

function transaction(fn) {
  const database = getDb();
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(database);
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

module.exports = {
  init,
  getDb,
  close,
  seedModerator,
  secret,
  transaction,
  moderatorWasCreated: () => moderatorCreated,
};
