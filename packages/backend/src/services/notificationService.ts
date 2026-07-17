import { prisma } from "../db/client.js";
import { findCycle, getProductDetail } from "../eol/eolService.js";
import { computeStatus } from "./statusService.js";
import { loadThresholdMap, resolveThresholdList } from "./thresholdService.js";

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002";
}

function buildMessage(product: string, cycle: string, daysRemaining: number, eolDate: string): string {
  return daysRemaining < 0
    ? `${product} ${cycle} is past its end-of-life date (${eolDate}).`
    : `${product} ${cycle} reaches end-of-life in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} (${eolDate}).`;
}

/**
 * For every stack item, checks whether its current daysRemaining has crossed any configured
 * threshold and creates a Notification if so. Relies on the (stackItemId, thresholdDays, eolDate)
 * unique constraint to dedup — re-running this against unchanged data creates nothing new, so it's
 * safe to call after every cache refresh or stack mutation.
 */
export async function generateNotifications(): Promise<number> {
  const items = await prisma.stackItem.findMany();
  const thresholdMap = await loadThresholdMap();
  let created = 0;

  for (const item of items) {
    let detail;
    try {
      detail = await getProductDetail(item.product);
    } catch {
      continue;
    }

    const cycle = findCycle(detail, item.cycle);
    if (!cycle) continue;

    const status = computeStatus(cycle);
    if (status.daysRemaining === null || !status.eolDate) continue;

    const thresholds = resolveThresholdList(thresholdMap, item.id);
    const crossedThresholds = thresholds.filter((days) => status.daysRemaining! <= days);

    for (const days of crossedThresholds) {
      try {
        await prisma.notification.create({
          data: {
            stackItemId: item.id,
            thresholdDays: days,
            eolDate: new Date(`${status.eolDate}T00:00:00.000Z`),
            message: buildMessage(item.product, item.cycle, status.daysRemaining, status.eolDate),
          },
        });
        created++;
      } catch (err) {
        if (!isUniqueConstraintError(err)) throw err;
        // Already notified for this item+threshold+eolDate combination.
      }
    }
  }

  return created;
}
