import { openDatabase } from "./database.js";

export function getReportData() {
  const db = openDatabase();
  const totals = db.prepare("SELECT COUNT(*) AS total_books, ROUND(AVG(price), 2) AS average_price FROM books").get();
  const mostExpensive = db.prepare("SELECT title, price, rating, url FROM books ORDER BY price DESC, title ASC LIMIT 5").all();
  const ratingBreakdown = db.prepare("SELECT rating, COUNT(*) AS count FROM books GROUP BY rating ORDER BY rating DESC").all();
  const books = db.prepare("SELECT title, price, rating, url FROM books ORDER BY title ASC").all();
  db.close();
  return { generatedAt: new Date().toISOString(), totals, mostExpensive, ratingBreakdown, books };
}
