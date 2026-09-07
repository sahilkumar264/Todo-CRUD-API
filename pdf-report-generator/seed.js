import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./database.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const booksPath = path.resolve(here, "..", "scraper", "output", "books.json");
const ratingByWord = { One: 1, Two: 2, Three: 3, Four: 4, Five: 5 };
const books = JSON.parse(await fs.readFile(booksPath, "utf8"));
const db = openDatabase();

db.exec("DELETE FROM books");
const insert = db.prepare("INSERT INTO books (title, price, rating, url) VALUES (?, ?, ?, ?)");
for (const book of books) {
  insert.run(book.title, book.price_gbp, ratingByWord[book.rating_text], book.product_url);
}
console.log(JSON.stringify({ seeded: db.prepare("SELECT COUNT(*) AS count FROM books").get().count }, null, 2));
db.close();
