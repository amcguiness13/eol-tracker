import type { StatusResult } from "@eol-tracker/shared";
import { Router } from "express";
import { prisma } from "../db/client.js";
import { findCycle, getProductDetail } from "../eol/eolService.js";
import { computeStatus } from "../services/statusService.js";
import { loadThresholdMap, resolveApproachingThreshold } from "../services/thresholdService.js";
import { refreshTrackedProducts } from "../jobs/refreshCache.js";

export const dashboardRouter = Router();

dashboardRouter.post("/refresh", async (_req, res, next) => {
  try {
    const refreshed = await refreshTrackedProducts();
    res.json({ result: { refreshedProducts: refreshed } });
  } catch (err) {
    next(err);
  }
});

function unknownStatus(): StatusResult {
  return { status: "supported", eolDate: null, supportEndDate: null, daysRemaining: null, daysUntilSupportEnd: null };
}

dashboardRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const items = await prisma.stackItem.findMany({ orderBy: { createdAt: "asc" } });
    const thresholdMap = await loadThresholdMap();

    const result = await Promise.all(
      items.map(async (item) => {
        try {
          const detail = await getProductDetail(item.product);
          const cycle = findCycle(detail, item.cycle);
          const approachingThreshold = resolveApproachingThreshold(thresholdMap, item.id);
          const status = cycle ? computeStatus(cycle, approachingThreshold) : unknownStatus();

          return {
            ...item,
            label: cycle?.label ?? item.cycle,
            category: detail.category ?? null,
            latestVersion: cycle?.latest?.name ?? null,
            isLts: Boolean(cycle?.isLts),
            status,
          };
        } catch {
          // Product/cycle no longer resolves against the catalog (e.g. renamed upstream).
          return {
            ...item,
            label: item.cycle,
            category: null,
            latestVersion: null,
            isLts: false,
            status: unknownStatus(),
          };
        }
      })
    );

    res.json({ result });
  } catch (err) {
    next(err);
  }
});
