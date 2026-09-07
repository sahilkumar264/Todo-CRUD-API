import express from "express";
import { createReport, findReport, publicReport } from "./reportsService.js";

const app = express();
const port = process.env.PORT || 3100;
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/reports", async (_req, res, next) => {
  try {
    const report = await createReport();
    res.status(201).json(publicReport(report));
  } catch (error) { next(error); }
});

app.get("/reports/:id", (req, res) => {
  const report = findReport(Number(req.params.id));
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(publicReport(report));
});

app.get("/reports/:id/file", (req, res) => {
  const report = findReport(Number(req.params.id));
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.download(report.path, `bookstore-report-${report.id}.pdf`);
});

app.use((error, _req, res, _next) => {
  console.error("Report error:", error.message);
  res.status(500).json({ error: "Could not generate report" });
});

app.listen(port, () => console.log(`PDF report API listening at http://localhost:${port}`));
