import type { EolStatus } from "@eol-tracker/shared";

const LABELS: Record<EolStatus, string> = {
  supported: "Supported",
  approaching: "Approaching EOL",
  eol: "End of Life",
};

export function StatusBadge({ status }: { status: EolStatus }) {
  return <span className={`status-badge ${status}`}>{LABELS[status]}</span>;
}
