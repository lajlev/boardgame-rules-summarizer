const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "summaries.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    game_title TEXT,
    original_filename TEXT,
    markdown TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertSummary = db.prepare(`
  INSERT INTO summaries (id, game_title, original_filename, markdown)
  VALUES (@id, @game_title, @original_filename, @markdown)
`);

const getSummary = db.prepare(`
  SELECT * FROM summaries WHERE id = ?
`);

module.exports = { db, insertSummary, getSummary };
