import cron from "node-cron";
import { prisma } from "../db/client.js";
import { refreshCacheFor } from "../eol/eolService.js";
import { generateNotifications } from "../services/notificationService.js";

/** Refreshes the cache only for products actually referenced by the saved stack, not the whole catalog. */
export async function refreshTrackedProducts(): Promise<string[]> {
  const items = await prisma.stackItem.findMany({ select: { product: true } });
  const uniqueSlugs = Array.from(new Set(items.map((i) => i.product)));
  await refreshCacheFor(uniqueSlugs);
  await generateNotifications();
  return uniqueSlugs;
}

/** Runs refreshTrackedProducts once a day at 03:00 server-local time. */
export function scheduleDailyRefresh(): void {
  cron.schedule("0 3 * * *", () => {
    refreshTrackedProducts().catch((err) => {
      console.error("Scheduled endoflife.date cache refresh failed:", err);
    });
  });
}
