# PDF report generator

This standalone Week 4/A8 project turns the 60 validated Books to Scrape records from Week 5 into a SQLite-backed PDF report. It is separate from the task API and the visual AI workflow project.

## Dataset

The project reuses `../scraper/output/books.json`, then seeds a local SQLite `books` table with title, price, rating, and product URL.

## Setup

```bash
cd pdf-report-generator
npm install
npx playwright install chromium
npm run seed
npm start
```
