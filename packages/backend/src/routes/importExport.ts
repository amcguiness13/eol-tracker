import { Router } from "express";
import { prisma } from "../db/client.js";
import { buildExportCsv, buildTemplateCsv, CsvCommitBlockedError, commitRows, parseCsv, validateRows } from "../services/csvService.js";
import { generateNotifications } from "../services/notificationService.js";

export const importExportRouter = Router();

function extractCsvText(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null && "csv" in body) {
    const csv = (body as { csv: unknown }).csv;
    return typeof csv === "string" ? csv : undefined;
  }
  return undefined;
}

importExportRouter.post("/stack/import/validate", async (req, res, next) => {
  try {
    const csv = extractCsvText(req.body);
    if (!csv) {
      res.status(400).json({ error: "request body must include a 'csv' string field" });
      return;
    }
    const rows = parseCsv(csv);
    const report = await validateRows(rows);
    res.json({ result: report });
  } catch (err) {
    next(err);
  }
});

importExportRouter.post("/stack/import/commit", async (req, res, next) => {
  try {
    const csv = extractCsvText(req.body);
    if (!csv) {
      res.status(400).json({ error: "request body must include a 'csv' string field" });
      return;
    }
    const rows = parseCsv(csv);
    const created = await commitRows(rows);
    generateNotifications().catch((err) => console.error("Failed to generate notifications:", err));
    res.status(201).json({ result: created, count: created.length });
  } catch (err) {
    if (err instanceof CsvCommitBlockedError) {
      res.status(400).json({ error: err.message, report: err.report });
      return;
    }
    next(err);
  }
});

importExportRouter.get("/stack/template.csv", (_req, res) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="eol-tracker-template.csv"');
  res.send(buildTemplateCsv());
});

importExportRouter.get("/stack/export.csv", async (_req, res, next) => {
  try {
    const items = await prisma.stackItem.findMany({ orderBy: { createdAt: "asc" } });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="eol-tracker-stack.csv"');
    res.send(buildExportCsv(items));
  } catch (err) {
    next(err);
  }
});
