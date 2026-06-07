const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/workload.db');

const db = new Database(dbPath);

// Performance optimizations for concurrent load -heavy api
db.pragma('journal_mode = WAL');      // ← allows concurrent reads & writes
db.pragma('synchronous = NORMAL');    // ← faster writes, still safe
db.pragma('cache_size = 10000');      // ← more memory cache
db.pragma('temp_store = MEMORY');     // ← temp tables in memory
module.exports = db;