const db = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payload TEXT,
    created_at INTEGER
  )
`);

console.log('Database initialized');