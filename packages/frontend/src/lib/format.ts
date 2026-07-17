export function formatDaysRemaining(days: number | null): string {
  if (days === null) return "—";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  return `${days} days remaining`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso;
}
