import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { buildReportHtml } from "./reportTemplate.js";

export async function renderReport(data, outputPath, screenshotPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(buildReportHtml(data), { waitUntil: "load" });
    if (screenshotPath) {
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: false });
    }
    await page.pdf({ path: outputPath, format: "A4", printBackground: true, margin: { top: "16mm", right: "14mm", bottom: "18mm", left: "14mm" } });
  } finally {
    await browser.close();
  }
}
