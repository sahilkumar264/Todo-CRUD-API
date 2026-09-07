# PDF report generator

This standalone Week 4/A8 project turns the 60 validated Books to Scrape records from Week 5 into a SQLite-backed PDF report. It is separate from the task API and the visual AI workflow project.

## Dataset

The project reuses `../scraper/output/books.json`, then seeds a local SQLite `books` table with title, price, rating, and product URL.

The seed script deletes old rows first, so running it twice still leaves exactly 60 records.

## Aggregation SQL

```sql
SELECT COUNT(*) AS total_books, ROUND(AVG(price), 2) AS average_price FROM books;
SELECT title, price, rating, url FROM books ORDER BY price DESC, title ASC LIMIT 5;
SELECT rating, COUNT(*) AS count FROM books GROUP BY rating ORDER BY rating DESC;
```

## PDF layout

The report is rendered by headless Chromium from HTML. Print CSS uses a repeating `<thead>` and `tr { break-inside: avoid; }`, so the long catalogue table remains readable across pages.

## Setup

```bash
cd pdf-report-generator
npm install
npx playwright install chromium
npm run seed
npm start
```
