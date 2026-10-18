const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.db');
const sqlite = new DatabaseSync(DB_PATH);

// Initialize users table in SQLite database.db
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ SQLite database initialized at:', DB_PATH);

module.exports = {
  sqlite,
  DB_PATH,
};
