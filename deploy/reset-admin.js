#!/usr/bin/env node
/**
 * Reset or create the admin login from .env values.
 * Usage on the server:
 *   cd /opt/musa
 *   node deploy/reset-admin.js
 *
 * Optional overrides:
 *   ADMIN_USERNAME=myuser ADMIN_PASSWORD=newpass ADMIN_NAME="My Name" node deploy/reset-admin.js
 */
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const root = path.join(__dirname, "..");
loadEnvFile(path.join(root, ".env"));

const username = (process.env.ADMIN_USERNAME || "ammad").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "ammad123";
const name = process.env.ADMIN_NAME || "Ammad Khan";
const dbPath =
  process.env.DATABASE_PATH || path.join(root, "data", "musa.db");

if (!password || password === "change-me-strong-password") {
  console.error("Set a real ADMIN_PASSWORD in /opt/musa/.env first, then re-run.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'member')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const hash = bcrypt.hashSync(password, 10);
const existing = db
  .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
  .get(username);

if (existing) {
  db.prepare(
    `UPDATE users SET password_hash = ?, name = ?, role = 'admin' WHERE id = ?`
  ).run(hash, name, existing.id);
  console.log(`Updated admin password for username: ${username}`);
} else {
  // Demote other admins? Keep them; just ensure this account exists as admin.
  db.prepare(
    `INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, 'admin')`
  ).run(username, hash, name);
  console.log(`Created admin username: ${username}`);
}

console.log(`Database: ${dbPath}`);
console.log(`Sign in at http://127.0.0.1:3000/login with:`);
console.log(`  username: ${username}`);
console.log(`  password: (the ADMIN_PASSWORD from .env)`);
