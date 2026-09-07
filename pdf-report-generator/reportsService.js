import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./database.js";
import { getReportData } from "./reportData.js";
import { renderReport } from "./reportRenderer.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const reportsDirectory = path.join(here, "reports");

export async function createReport() {
  const db = openDatabase();
  const createdAt = new Date().toISOString();
  const result = db.prepare("INSERT INTO reports (path, created_at) VALUES (?, ?)").run("pending", createdAt);
  const id = Number(result.lastInsertRowid);
  const reportPath = path.join(reportsDirectory, `bookstore-report-${id}.pdf`);
  try {
    await fs.mkdir(reportsDirectory, { recursive: true });
    await renderReport(getReportData(), reportPath);
    db.prepare("UPDATE reports SET path = ? WHERE id = ?").run(reportPath, id);
    return { id, path: reportPath, created_at: createdAt };
  } catch (error) {
    db.prepare("DELETE FROM reports WHERE id = ?").run(id);
    throw error;
  } finally {
    db.close();
  }
}

export function findReport(id) {
  const db = openDatabase();
  const report = db.prepare("SELECT id, path, created_at FROM reports WHERE id = ?").get(id);
  db.close();
  return report || null;
}

export function findReportCreatedToday() {
  const db = openDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const report = db.prepare("SELECT id, path, created_at FROM reports WHERE created_at LIKE ? ORDER BY id DESC LIMIT 1").get(`${today}%`);
  db.close();
  return report || null;
}

export function listReports() {
  const db = openDatabase();
  const reports = db.prepare("SELECT id, path, created_at FROM reports ORDER BY id DESC").all();
  db.close();
  return reports;
}

export function publicReport(report) {
  return { id: report.id, created_at: report.created_at, file: `/reports/${report.id}/file` };
}
