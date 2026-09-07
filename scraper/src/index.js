const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { setTimeout: sleep } = require("node:timers/promises");
const cheerio = require("cheerio");
const { z } = require("zod");

const ROOT_URL = "https://books.toscrape.com/";
const MAX_CATALOGUE_PAGES = 3;
const REQUEST_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 7000;
const USER_AGENT = "FlyRankInternship-A9/1.0 (+https://github.com/sahilkumar264/Todo-CRUD-API)";
const projectRoot = path.resolve(__dirname, "..");
const cacheDirectory = path.join(projectRoot, "cache");
const outputDirectory = path.join(projectRoot, "output");

const BookSchema = z.object({
  title: z.string().min(1),
  product_url: z.url().refine((url) => url.startsWith("https://"), "product_url must use https"),
  price_text: z.string().min(1),
  price_gbp: z.number().finite().nonnegative(),
  availability_text: z.string().min(1),
  rating_text: z.enum(["One", "Two", "Three", "Four", "Five"]),
  description: z.string().nullable(),
  source_page: z.url().refine((url) => url.startsWith("https://"), "source_page must use https"),
  fetched_at: z.string().datetime({ offset: true })
});

class FetchFailure extends Error {
  constructor(message, { status, retryable = false } = {}) {
    super(message);
    this.name = "FetchFailure";
    this.status = status;
    this.retryable = retryable;
  }
}

function cleanText(value) {
  return value ? value.replace(/\s+/g, " ").trim() : "";
}

function cacheFileFor(url, kind) {
  if (kind.startsWith("catalogue-page-")) {
    return path.join(cacheDirectory, `${kind}.html`);
  }

  const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
  return path.join(cacheDirectory, `book-${hash}.html`);
}

function canRetry(error) {
  return error instanceof FetchFailure && error.retryable;
}

async function fetchHtml(url, cacheFile, report, networkState) {
  try {
    const html = await fs.readFile(cacheFile, "utf8");
    report.cache_hits += 1;
    console.log(`CACHE HIT ${url} bytes=${Buffer.byteLength(html)}`);
    return html;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const waitFor = Math.max(0, REQUEST_DELAY_MS - (Date.now() - networkState.lastRequestAt));
    if (waitFor > 0) await sleep(waitFor);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    networkState.lastRequestAt = Date.now();

    try {
      const response = await fetch(url, {
        headers: { "user-agent": USER_AGENT },
        signal: controller.signal
      });

      if (response.status !== 200) {
        throw new FetchFailure(`HTTP ${response.status}`, {
          status: response.status,
          retryable: response.status >= 500
        });
      }

      const html = await response.text();
      await fs.writeFile(cacheFile, html, "utf8");
      report.pages_fetched += 1;
      console.log(`FETCH ${url} status=200 bytes=${Buffer.byteLength(html)}`);
      return html;
    } catch (error) {
      const failure = error.name === "AbortError"
        ? new FetchFailure(`Timed out after ${REQUEST_TIMEOUT_MS}ms`, { retryable: true })
        : error;

      if (attempt === 1 && canRetry(failure)) {
        console.log(`RETRY ${url} reason=${failure.message}`);
        await sleep(1000);
        continue;
      }
      throw failure;
    } finally {
      clearTimeout(timer);
    }
  }
}

function extractCataloguePage(html, pageUrl) {
  const $ = cheerio.load(html);
  const bookUrls = $("article.product_pod h3 a")
    .map((_, element) => new URL($(element).attr("href"), pageUrl).href)
    .get();
  const nextHref = $("li.next a").attr("href");

  return {
    bookUrls,
    nextPageUrl: nextHref ? new URL(nextHref, pageUrl).href : null
  };
}

function extractRawBook(html, productUrl, sourcePage) {
  const $ = cheerio.load(html);
  const ratingClasses = $(".product_main p.star-rating").attr("class") || "";
  const rating = ratingClasses.split(/\s+/).find((name) => ["One", "Two", "Three", "Four", "Five"].includes(name));
  const descriptionHeading = $("#product_description");
  const description = descriptionHeading.length ? cleanText(descriptionHeading.next("p").text()) || null : null;

  return {
    title: cleanText($(".product_main h1").text()),
    product_url: productUrl,
    price_text: cleanText($(".product_main .price_color").text()),
    availability_text: cleanText($(".product_main .availability").text()),
    rating_text: rating || "",
    description,
    source_page: sourcePage,
    fetched_at: new Date().toISOString()
  };
}

function normalizeBook(rawBook) {
  const numericPrice = Number(rawBook.price_text.replace(/[^0-9.]/g, ""));
  return { ...rawBook, price_gbp: numericPrice };
}

function errorEntry(url, stage, error) {
  return {
    url,
    stage,
    reason: error instanceof z.ZodError ? z.prettifyError(error) : error.message,
    status: error.status || null
  };
}

async function discoverBooks(report, networkState) {
  let currentPageUrl = ROOT_URL;
  const discovered = [];

  for (let pageNumber = 1; pageNumber <= MAX_CATALOGUE_PAGES; pageNumber += 1) {
    if (!currentPageUrl) throw new Error(`Catalogue ended before page ${MAX_CATALOGUE_PAGES}`);
    const html = await fetchHtml(
      currentPageUrl,
      cacheFileFor(currentPageUrl, `catalogue-page-${pageNumber}`),
      report,
      networkState
    );
    const page = extractCataloguePage(html, currentPageUrl);
    report.catalogue_pages += 1;
    discovered.push(...page.bookUrls.map((url) => ({ url, sourcePage: currentPageUrl })));
    currentPageUrl = page.nextPageUrl;
  }

  const uniqueByUrl = new Map(discovered.map((entry) => [entry.url, entry]));
  report.discovered = discovered.length;
  report.unique_urls = uniqueByUrl.size;
  console.log(`catalogue_pages=${report.catalogue_pages} discovered=${report.discovered} unique_urls=${report.unique_urls}`);
  return [...uniqueByUrl.values()];
}

async function main() {
  await fs.mkdir(cacheDirectory, { recursive: true });
  await fs.mkdir(outputDirectory, { recursive: true });

  const startedAt = new Date();
  const report = {
    started_at: startedAt.toISOString(),
    duration_ms: 0,
    catalogue_pages: 0,
    discovered: 0,
    unique_urls: 0,
    pages_fetched: 0,
    cache_hits: 0,
    valid_records: 0,
    invalid_records: 0,
    failed_pages: 0,
    failures: []
  };
  const errors = [];
  const networkState = { lastRequestAt: 0 };
  const recordsByUrl = new Map();

  let books;
  try {
    books = await discoverBooks(report, networkState);
  } catch (error) {
    report.failed_pages += 1;
    report.failures.push(errorEntry(ROOT_URL, "catalogue discovery", error));
    books = [];
  }

  if (process.argv.includes("--include-broken-url")) {
    books.push({
      url: "https://books.toscrape.com/catalogue/this-book-does-not-exist_0/index.html",
      sourcePage: ROOT_URL
    });
  }

  for (const book of books) {
    try {
      const html = await fetchHtml(book.url, cacheFileFor(book.url, "book"), report, networkState);
      const rawBook = extractRawBook(html, book.url, book.sourcePage);
      const validatedBook = BookSchema.parse(normalizeBook(rawBook));
      recordsByUrl.set(validatedBook.product_url, validatedBook);
    } catch (error) {
      const entry = errorEntry(book.url, "book detail", error);
      errors.push(entry);
      report.failures.push(entry);
      if (error instanceof z.ZodError) report.invalid_records += 1;
      else report.failed_pages += 1;
      console.log(`SKIP ${book.url} reason=${entry.reason}`);
    }
  }

  const records = [...recordsByUrl.values()];
  report.valid_records = records.length;
  report.duration_ms = Date.now() - startedAt.getTime();

  await fs.writeFile(path.join(outputDirectory, "books.json"), `${JSON.stringify(records, null, 2)}\n`);
  await fs.writeFile(path.join(outputDirectory, "errors.json"), `${JSON.stringify(errors, null, 2)}\n`);
  await fs.writeFile(path.join(outputDirectory, "run-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`detail_pages=${records.length} valid_records=${report.valid_records} invalid_records=${report.invalid_records} failed_pages=${report.failed_pages}`);
  console.log(`Run report: ${path.join(outputDirectory, "run-report.json")}`);
}

main().catch((error) => {
  console.error("Fatal scraper error:", error.message);
  process.exitCode = 1;
});
