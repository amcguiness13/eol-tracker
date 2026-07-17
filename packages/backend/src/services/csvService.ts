import {
  CSV_COLUMNS,
  STACK_ITEM_SOURCES,
  type CsvRowError,
  type CsvRowInput,
  type CsvRowReport,
  type CsvValidationReport,
  type StackItemSource,
} from "@eol-tracker/shared";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { prisma } from "../db/client.js";
import { validateProductCycle } from "./stackItemValidation.js";

/** Shape as stored/returned by Prisma — distinct from the shared `StackItem` API type
 * (Date objects instead of ISO strings, `source` as a bare string instead of the union). */
export interface StackItemRecord {
  id: string;
  product: string;
  cycle: string;
  environment: string;
  owner: string | null;
  notes: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CsvCommitBlockedError extends Error {
  report: CsvValidationReport;
  constructor(report: CsvValidationReport) {
    super("CSV validation failed; nothing was imported");
    this.report = report;
  }
}

/** Parses raw CSV text into rows. Does not validate product/cycle values. */
export function parseCsv(text: string): CsvRowInput[] {
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string | undefined>[];

  return records.map((r) => ({
    product: r.product ?? "",
    cycle: r.cycle ?? "",
    environment: r.environment,
    owner: r.owner,
    notes: r.notes,
    source: r.source,
  }));
}

function isValidSource(value: string): value is StackItemSource {
  return (STACK_ITEM_SOURCES as string[]).includes(value);
}

/**
 * Validates every row against the live/cached endoflife.date catalog. Row numbers are
 * 1-indexed data rows (the header row is not counted), matching what a user sees when
 * they open the CSV in a spreadsheet and look at row 2, 3, 4... for the first data rows.
 */
export async function validateRows(rows: CsvRowInput[]): Promise<CsvValidationReport> {
  const reports: CsvRowReport[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const errors: CsvRowError[] = [];

    const product = row.product?.trim() ?? "";
    const cycle = row.cycle?.trim() ?? "";

    if (!product) {
      errors.push({ field: "product", message: "product is required" });
    }
    if (!cycle) {
      errors.push({ field: "cycle", message: "cycle is required" });
    }

    const source = row.source?.trim().toLowerCase();
    if (source && !isValidSource(source)) {
      errors.push({
        field: "source",
        message: `source must be one of ${STACK_ITEM_SOURCES.join(", ")}`,
      });
    }

    if (product && cycle) {
      const validation = await validateProductCycle(product, cycle);
      if (!validation.ok) {
        const field = validation.error?.startsWith("cycle") ? "cycle" : "product";
        errors.push({ field, message: validation.error ?? "invalid product/cycle", suggestion: validation.suggestion });
      }
    }

    reports.push({ rowNumber, raw: row, errors });
  }

  return {
    totalRows: rows.length,
    valid: rows.length > 0 && reports.every((r) => r.errors.length === 0),
    rows: reports,
  };
}

/** Re-validates (never trusts a client-side validation pass) then writes all rows atomically. */
export async function commitRows(rows: CsvRowInput[]): Promise<StackItemRecord[]> {
  const report = await validateRows(rows);
  if (!report.valid) {
    throw new CsvCommitBlockedError(report);
  }

  return prisma.$transaction(
    rows.map((row) => {
      const product = row.product.trim().toLowerCase();
      const cycle = row.cycle.trim();
      const environment = row.environment?.trim() || "unspecified";
      const owner = row.owner?.trim() || null;
      const notes = row.notes?.trim() || null;
      const source = (row.source?.trim().toLowerCase() as StackItemSource | undefined) ?? "manual";

      return prisma.stackItem.upsert({
        where: { product_cycle_environment: { product, cycle, environment } },
        create: { product, cycle, environment, owner, notes, source },
        update: { owner, notes, source },
      });
    })
  );
}

export function buildTemplateCsv(): string {
  return stringify([], { header: true, columns: CSV_COLUMNS as unknown as string[] });
}

export function buildExportCsv(items: StackItemRecord[]): string {
  const records = items.map((item) => ({
    product: item.product,
    cycle: item.cycle,
    environment: item.environment,
    owner: item.owner ?? "",
    notes: item.notes ?? "",
    source: item.source,
  }));
  return stringify(records, { header: true, columns: CSV_COLUMNS as unknown as string[] });
}
