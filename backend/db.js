const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'data.db')}`,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function initDb() {
  await db.execute(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    theme TEXT,
    description TEXT,
    photo_path TEXT,
    link TEXT,
    event_date TEXT NOT NULL,
    location TEXT,
    max_participants INTEGER DEFAULT 20,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    is_active INTEGER DEFAULT 1
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INTEGER,
    phone TEXT,
    pin_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INTEGER,
    phone TEXT,
    user_id INTEGER,
    registered_at TEXT DEFAULT (datetime('now','localtime')),
    status TEXT DEFAULT 'registered',
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`);

  const { rows } = await db.execute("SELECT id FROM admins WHERE username = 'admin'");
  if (rows.length === 0) {
    const hash = bcrypt.hashSync('activites2024', 10);
    await db.execute({ sql: "INSERT INTO admins (username, password_hash) VALUES ('admin', ?)", args: [hash] });
    console.log('Admin créé: admin / activites2024');
  }
}

// Convertit une Row libsql en objet plain
function toObj(row) {
  if (!row) return null;
  const obj = {};
  for (const key of Object.keys(row)) {
    if (isNaN(Number(key))) obj[key] = row[key];
  }
  return obj;
}

function toRows(rows) {
  return rows.map(toObj);
}

module.exports = { db, initDb, toObj, toRows };
