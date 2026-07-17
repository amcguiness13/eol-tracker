import { useState } from "react";
import type { CsvValidationReport } from "@eol-tracker/shared";
import { importApi } from "../api/importClient";

export function CsvImportWizard() {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [report, setReport] = useState<CsvValidationReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setReport(null);
    setSuccessCount(null);
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    setBusy(true);
    try {
      const { result } = await importApi.validate(text);
      setReport(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!csvText) return;
    setBusy(true);
    setError(null);
    try {
      const result = await importApi.commit(csvText);
      if (result.report) {
        // server-side re-validation found something the client-side pass missed
        setReport(result.report);
        setError(result.error ?? "Validation failed on commit");
        return;
      }
      setSuccessCount(result.count ?? 0);
      setReport(null);
      setCsvText(null);
      setFileName(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="csv-import-wizard">
      <div className="csv-import-actions">
        <a href={importApi.templateUrl}>Download template CSV</a>
        <a href={importApi.exportUrl}>Download my current stack as CSV</a>
      </div>

      <label className="file-input-label">
        Import from CSV
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>

      {fileName && <p>Selected: {fileName}</p>}
      {busy && <p>Working...</p>}
      {error && <p className="error-text">{error}</p>}
      {successCount !== null && <p className="success-text">Imported {successCount} row(s) successfully.</p>}

      {report && (
        <div className="csv-report">
          <h3>
            Validation report: {report.rows.filter((r) => r.errors.length === 0).length} / {report.totalRows} rows
            valid
          </h3>
          <table>
            <thead>
              <tr>
                <th>Row</th>
                <th>Product</th>
                <th>Cycle</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.rowNumber} className={row.errors.length > 0 ? "row-error" : "row-ok"}>
                  <td>{row.rowNumber}</td>
                  <td>{row.raw.product}</td>
                  <td>{row.raw.cycle}</td>
                  <td>
                    {row.errors.length === 0
                      ? "OK"
                      : row.errors
                          .map((e) => `${e.message}${e.suggestion ? ` — did you mean '${e.suggestion}'?` : ""}`)
                          .join("; ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {report.valid ? (
            <button type="button" onClick={handleConfirm} disabled={busy}>
              Confirm import
            </button>
          ) : (
            <p>Fix the rows above and re-upload before importing.</p>
          )}
        </div>
      )}
    </div>
  );
}
