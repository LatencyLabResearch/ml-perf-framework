const db = require('../database/db');

const createRequest = (payload) => {
  return db
    .prepare('INSERT INTO requests (payload, created_at) VALUES (?, ?)')
    .run(payload, Date.now());
};

const getRequestCount = () => {
  return db
    .prepare('SELECT COUNT(*) as cnt FROM requests')
    .get();
};

module.exports = {
  createRequest,
  getRequestCount,
};