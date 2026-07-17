import type { CsvValidationReport, StackItem } from "@eol-tracker/shared";

async function postCsv<T>(path: string, csv: string): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && !("report" in body)) {
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return body as T;
}

export const importApi = {
  validate: (csv: string) => postCsv<{ result: CsvValidationReport }>("/stack/import/validate", csv),
  commit: (csv: string) => postCsv<{ result?: StackItem[]; count?: number; error?: string; report?: CsvValidationReport }>(
    "/stack/import/commit",
    csv
  ),
  templateUrl: "/api/stack/template.csv",
  exportUrl: "/api/stack/export.csv",
};
