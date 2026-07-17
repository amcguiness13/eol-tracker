import { Router } from "express";
import { prisma } from "../db/client.js";
import { generateNotifications } from "../services/notificationService.js";

export const notificationsRouter = Router();

const VALID_STATUSES = new Set(["unread", "read", "dismissed"]);

notificationsRouter.get("/notifications", async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = typeof status === "string" && VALID_STATUSES.has(status) ? { status } : {};
    const notifications = await prisma.notification.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json({ result: notifications });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post("/notifications/generate", async (_req, res, next) => {
  try {
    const created = await generateNotifications();
    res.json({ result: { created } });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post("/notifications/:id/read", async (req, res, next) => {
  try {
    const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { status: "read" } });
    res.json({ result: updated });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post("/notifications/:id/dismiss", async (req, res, next) => {
  try {
    const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { status: "dismissed" } });
    res.json({ result: updated });
  } catch (err) {
    next(err);
  }
});

// --- Thresholds -------------------------------------------------------------

notificationsRouter.get("/thresholds", async (req, res, next) => {
  try {
    const { stackItemId } = req.query;
    const scopeId = typeof stackItemId === "string" ? stackItemId : null;
    const thresholds = await prisma.threshold.findMany({ where: { stackItemId: scopeId }, orderBy: { days: "desc" } });
    res.json({ result: thresholds });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.put("/thresholds", async (req, res, next) => {
  try {
    const { stackItemId, days } = req.body ?? {};
    if (!Array.isArray(days) || days.length === 0 || !days.every((d) => Number.isInteger(d) && d >= 0)) {
      res.status(400).json({ error: "days must be a non-empty array of non-negative integers" });
      return;
    }
    const scopeId = typeof stackItemId === "string" ? stackItemId : null;

    await prisma.$transaction([
      prisma.threshold.deleteMany({ where: { stackItemId: scopeId } }),
      prisma.threshold.createMany({ data: days.map((d: number) => ({ stackItemId: scopeId, days: d })) }),
    ]);

    const updated = await prisma.threshold.findMany({ where: { stackItemId: scopeId }, orderBy: { days: "desc" } });
    res.json({ result: updated });
  } catch (err) {
    next(err);
  }
});
