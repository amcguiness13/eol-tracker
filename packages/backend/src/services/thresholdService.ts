import { prisma } from "../db/client.js";
import { DEFAULT_APPROACHING_THRESHOLD_DAYS } from "./statusService.js";

export interface ThresholdMap {
  global: number[];
  byItem: Map<string, number[]>;
}

/** Loads every configured threshold in one query so per-item resolution needs no extra DB round-trips. */
export async function loadThresholdMap(): Promise<ThresholdMap> {
  const all = await prisma.threshold.findMany();
  const global: number[] = [];
  const byItem = new Map<string, number[]>();

  for (const t of all) {
    if (t.stackItemId === null) {
      global.push(t.days);
    } else {
      const arr = byItem.get(t.stackItemId) ?? [];
      arr.push(t.days);
      byItem.set(t.stackItemId, arr);
    }
  }

  return { global, byItem };
}

/** Per-item thresholds override the global default set; the largest configured value
 * becomes the "approaching" cutoff (i.e. the earliest warning distance). */
export function resolveApproachingThreshold(map: ThresholdMap, stackItemId: string): number {
  const days = map.byItem.get(stackItemId) ?? map.global;
  return days.length > 0 ? Math.max(...days) : DEFAULT_APPROACHING_THRESHOLD_DAYS;
}

/** All distinct threshold day values that apply to an item — used to detect newly-crossed thresholds. */
export function resolveThresholdList(map: ThresholdMap, stackItemId: string): number[] {
  const days = map.byItem.get(stackItemId) ?? map.global;
  return days.length > 0 ? days : [DEFAULT_APPROACHING_THRESHOLD_DAYS];
}

export const DEFAULT_GLOBAL_THRESHOLDS = [90, 30, 7];

/** Seeds the standard 90/30/7-day global thresholds on first run, if none are configured yet. */
export async function ensureDefaultThresholds(): Promise<void> {
  const existingGlobal = await prisma.threshold.count({ where: { stackItemId: null } });
  if (existingGlobal > 0) return;

  await prisma.threshold.createMany({
    data: DEFAULT_GLOBAL_THRESHOLDS.map((days) => ({ stackItemId: null, days })),
  });
}
