const db = require('./db');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  console.log('Database initialized');
} catch (error) {
  console.error('Database initialization failed:', error);
  process.exit(1);
}