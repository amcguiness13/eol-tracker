/** EOL Tracker's own app data model — separate from the endoflife.date cache. */

export type StackItemSource = "manual" | "github" | "azure" | "gcp";

export const STACK_ITEM_SOURCES: StackItemSource[] = ["manual", "github", "azure", "gcp"];

export interface StackItem {
  id: string;
  product: string;
  cycle: string;
  environment: string;
  owner: string | null;
  notes: string | null;
  source: StackItemSource;
  createdAt: string;
  updatedAt: string;
}

export interface StackItemInput {
  product: string;
  cycle: string;
  environment?: string;
  owner?: string | null;
  notes?: string | null;
  source?: StackItemSource;
}

export type EolStatus = "supported" | "approaching" | "eol";

export interface StatusResult {
  status: EolStatus;
  eolDate: string | null;
  supportEndDate: string | null;
  daysRemaining: number | null;
  daysUntilSupportEnd: number | null;
}

export interface StackItemWithStatus extends StackItem {
  label: string;
  category: string | null;
  latestVersion: string | null;
  isLts: boolean;
  status: StatusResult;
}

/** The 5 CSV columns, in canonical order. product/cycle required, the rest optional. */
export const CSV_COLUMNS = ["product", "cycle", "environment", "owner", "notes", "source"] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];

export interface CsvRowInput {
  product: string;
  cycle: string;
  environment?: string;
  owner?: string;
  notes?: string;
  source?: string;
}

export interface CsvRowError {
  field: CsvColumn;
  message: string;
  suggestion?: string;
}

export interface CsvRowReport {
  rowNumber: number;
  raw: CsvRowInput;
  errors: CsvRowError[];
}

export interface CsvValidationReport {
  totalRows: number;
  valid: boolean;
  rows: CsvRowReport[];
}

export interface ThresholdConfig {
  id: string;
  stackItemId: string | null;
  days: number;
}

export type NotificationStatus = "unread" | "read" | "dismissed";
export type NotificationChannel = "in-app" | "email" | "webhook";

export interface AppNotification {
  id: string;
  stackItemId: string;
  thresholdDays: number;
  eolDate: string;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  createdAt: string;
}
