# FlyRank A9 - The polite scraper

This is the Week 5 scraper assignment. It uses Node.js, Cheerio, and Zod to collect a small, reproducible dataset from [Books to Scrape](https://books.toscrape.com/).

## Target classification

- **Target:** Books to Scrape, a public practice sandbox expressly made for scraping practice.
- **Scope:** exactly the first three catalogue pages, which discover 60 book pages.
- **Data collected:** the title, product URL, shown price, availability, rating, optional description, source catalogue page, and fetch timestamp.
- **Robots check:** `https://books.toscrape.com/robots.txt` was requested once and returned `404` (no robots file found). A missing file is not permission; the sandbox's stated practice purpose and this narrow scope are why this assignment is appropriate.
- **Boundary:** I will not reuse this code on another site without checking its rules and terms first.

## Run it

Node.js 20+ is required.

```bash
cd scraper
npm install
npm start
```

The first run makes at most one request per page, saving the HTML under `cache/`. Later runs use the cache and produce the same 60 unique records without duplicating output.

To prove a bad page is skipped without harming the 60 good records:

```bash
npm run test:failure
```

## Output schema

Validated records are written to `output/books.json`; rejected records and their reasons go to `output/errors.json`.

```json
{
  "title": "A Light in the Attic",
  "product_url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  "price_text": "£51.77",
  "price_gbp": 51.77,
  "availability_text": "In stock (22 available)",
  "rating_text": "Three",
  "description": "... or null",
  "source_page": "https://books.toscrape.com/",
  "fetched_at": "2026-09-07T10:00:00.000Z"
}
```

`product_url` is the canonical identity, and every record is validated with Zod before it can reach `books.json`.

## Politeness rules

- Every request identifies this project with an honest user-agent and repository link.
- Every request has a 7-second timeout and status-code check.
- Real network requests are separated by at least 500 ms; cached reads make no request.
- Timeout and server errors are retried once; 403 and 404 responses are logged and skipped without retrying.
- The scraper only targets this sandbox and only needs the first three catalogue pages.

## Why no browser?

The needed book data is already in the HTML returned by the server, so a browser would only add cost and complexity.

## Example real run report

The first live run completed with 60 validated records and no failures:

```json
{
  "catalogue_pages": 3,
  "discovered": 60,
  "unique_urls": 60,
  "pages_fetched": 63,
  "cache_hits": 0,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0
}
```

## Ethics

Use an official API when one exists. Never bypass logins, paywalls, or blocks, and collect only the data that is needed for the task.

## Honest limitation

This is deliberately a small sequential learning scraper. It does not implement production-scale concurrency, rotating proxies, or long-term change detection.
