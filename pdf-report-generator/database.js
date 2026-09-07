import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const databasePath = path.join(here, "report.db");

export function openDatabase() {
  const db = new DatabaseSync(databasePath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      price REAL NOT NULL,
      rating INTEGER NOT NULL,
      url TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}
