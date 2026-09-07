import path from "node:path";
import { fileURLToPath } from "node:url";
import { getReportData } from "./reportData.js";
import { renderReport } from "./reportRenderer.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.join(here, "reports", "test.pdf");
const screenshotPath = path.join(here, "assets", "report-page-1.png");
await renderReport(getReportData(), pdfPath, screenshotPath);
console.log(pdfPath);
