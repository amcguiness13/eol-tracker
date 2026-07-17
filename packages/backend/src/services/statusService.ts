import type { EolCycle, EolStatus, StatusResult } from "@eol-tracker/shared";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_APPROACHING_THRESHOLD_DAYS = 90;

/** Whole calendar days from `from` (any time of day) to the UTC-midnight of `toIso` (YYYY-MM-DD). */
function daysBetween(from: Date, toIso: string): number {
  const to = new Date(`${toIso}T00:00:00.000Z`);
  const fromUtcMidnight = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((to.getTime() - fromUtcMidnight) / MS_PER_DAY);
}

/**
 * Computes display status for one release cycle.
 *
 * `eolFrom` (when present) is treated as the authoritative EOL date whether it's in the past
 * (already EOL) or the future (a known/planned EOL date) — the endoflife.date API always
 * populates it once a date is known, regardless of its own `isEol` boolean. A cycle with no
 * `eolFrom` at all has no known EOL date and is treated as indefinitely supported.
 *
 * `approachingThresholdDays` is normally the largest configured notification threshold for the
 * item (falling back to the 90-day default) — a cycle within that many days of EOL is "approaching".
 */
export function computeStatus(
  cycle: Pick<EolCycle, "eolFrom" | "eoasFrom" | "discontinuedFrom">,
  approachingThresholdDays: number = DEFAULT_APPROACHING_THRESHOLD_DAYS,
  now: Date = new Date()
): StatusResult {
  const eolDate = cycle.eolFrom ?? null;
  const supportEndDate = cycle.eoasFrom ?? cycle.discontinuedFrom ?? null;

  const daysRemaining = eolDate ? daysBetween(now, eolDate) : null;
  const daysUntilSupportEnd = supportEndDate ? daysBetween(now, supportEndDate) : null;

  let status: EolStatus = "supported";
  if (daysRemaining !== null) {
    if (daysRemaining < 0) {
      status = "eol";
    } else if (daysRemaining <= approachingThresholdDays) {
      status = "approaching";
    }
  }

  return { status, eolDate, supportEndDate, daysRemaining, daysUntilSupportEnd };
}
