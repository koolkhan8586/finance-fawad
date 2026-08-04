import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const globalForDb = globalThis as unknown as {
  musaDb?: Database.Database;
};

function resolveDbPath() {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "musa.db");
}

function columnExists(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

function migrate(db: Database.Database) {
  if (!columnExists(db, "users", "email")) {
    db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
  }
  if (!columnExists(db, "users", "whatsapp_phone")) {
    db.exec(`ALTER TABLE users ADD COLUMN whatsapp_phone TEXT`);
  }
  if (!columnExists(db, "users", "whatsapp_apikey")) {
    db.exec(`ALTER TABLE users ADD COLUMN whatsapp_apikey TEXT`);
  }
  if (!columnExists(db, "transactions", "original_amount")) {
    db.exec(`ALTER TABLE transactions ADD COLUMN original_amount REAL`);
  }
  if (!columnExists(db, "transactions", "exchange_rate")) {
    db.exec(`ALTER TABLE transactions ADD COLUMN exchange_rate REAL DEFAULT 1`);
  }
  // Backfill older rows: treat stored amount as PKR
  db.exec(`
    UPDATE transactions
    SET original_amount = amount,
        exchange_rate = COALESCE(exchange_rate, 1)
    WHERE original_amount IS NULL
  `);
}

function createDb() {
  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'member')),
      email TEXT,
      whatsapp_phone TEXT,
      whatsapp_apikey TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS book_members (
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (book_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('gave', 'received', 'expense', 'settlement', 'adjustment')),
      amount REAL NOT NULL CHECK(amount >= 0),
      currency TEXT NOT NULL DEFAULT 'PKR',
      original_amount REAL,
      exchange_rate REAL DEFAULT 1,
      description TEXT,
      occurred_on TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      from_user_id INTEGER REFERENCES users(id),
      to_user_id INTEGER REFERENCES users(id),
      paid_by_user_id INTEGER REFERENCES users(id),
      split_with_user_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_book ON transactions(book_id, occurred_on DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_book_members_user ON book_members(user_id);
  `);

  migrate(db);
  seedAdmin(db);
  return db;
}

function seedAdmin(db: Database.Database) {
  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existing) return;

  const username = process.env.ADMIN_USERNAME || "ammad";
  const password = process.env.ADMIN_PASSWORD || "ammad123";
  const name = process.env.ADMIN_NAME || "Ammad Khan";
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO users (username, password_hash, name, role)
     VALUES (?, ?, ?, 'admin')`
  ).run(username, passwordHash, name);
}

export function getDb() {
  if (!globalForDb.musaDb) {
    globalForDb.musaDb = createDb();
  }
  return globalForDb.musaDb;
}
