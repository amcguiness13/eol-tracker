import { STACK_ITEM_SOURCES, type StackItemSource } from "@eol-tracker/shared";
import { Router } from "express";
import { prisma } from "../db/client.js";
import { generateNotifications } from "../services/notificationService.js";
import { validateProductCycle } from "../services/stackItemValidation.js";

export const stackRouter = Router();

function isStackItemSource(value: unknown): value is StackItemSource {
  return typeof value === "string" && (STACK_ITEM_SOURCES as string[]).includes(value);
}

stackRouter.get("/stack", async (_req, res, next) => {
  try {
    const items = await prisma.stackItem.findMany({ orderBy: { createdAt: "asc" } });
    res.json({ result: items });
  } catch (err) {
    next(err);
  }
});

stackRouter.post("/stack", async (req, res, next) => {
  try {
    const { product, cycle, environment, owner, notes, source } = req.body ?? {};

    if (typeof product !== "string" || !product.trim() || typeof cycle !== "string" || !cycle.trim()) {
      res.status(400).json({ error: "product and cycle are required" });
      return;
    }
    if (source !== undefined && !isStackItemSource(source)) {
      res.status(400).json({ error: `source must be one of ${STACK_ITEM_SOURCES.join(", ")}` });
      return;
    }

    const validation = await validateProductCycle(product, cycle);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error, suggestion: validation.suggestion });
      return;
    }

    const created = await prisma.stackItem.create({
      data: {
        product: validation.normalizedProduct,
        cycle: cycle.trim(),
        environment: typeof environment === "string" && environment.trim() ? environment.trim() : "unspecified",
        owner: typeof owner === "string" && owner.trim() ? owner.trim() : null,
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
        source: source ?? "manual",
      },
    });
    generateNotifications().catch((err) => console.error("Failed to generate notifications:", err));
    res.status(201).json({ result: created });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      res.status(409).json({ error: "This product + cycle + environment combination is already in your stack" });
      return;
    }
    next(err);
  }
});

stackRouter.put("/stack/:id", async (req, res, next) => {
  try {
    const existing = await prisma.stackItem.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "stack item not found" });
      return;
    }

    const { product, cycle, environment, owner, notes, source } = req.body ?? {};
    const nextProduct = typeof product === "string" && product.trim() ? product : existing.product;
    const nextCycle = typeof cycle === "string" && cycle.trim() ? cycle : existing.cycle;

    if (source !== undefined && !isStackItemSource(source)) {
      res.status(400).json({ error: `source must be one of ${STACK_ITEM_SOURCES.join(", ")}` });
      return;
    }

    const validation = await validateProductCycle(nextProduct, nextCycle);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error, suggestion: validation.suggestion });
      return;
    }

    const updated = await prisma.stackItem.update({
      where: { id: req.params.id },
      data: {
        product: validation.normalizedProduct,
        cycle: nextCycle.trim(),
        environment: typeof environment === "string" && environment.trim() ? environment.trim() : existing.environment,
        owner: owner === null ? null : typeof owner === "string" ? owner.trim() || null : existing.owner,
        notes: notes === null ? null : typeof notes === "string" ? notes.trim() || null : existing.notes,
        source: source ?? existing.source,
      },
    });
    res.json({ result: updated });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      res.status(409).json({ error: "This product + cycle + environment combination is already in your stack" });
      return;
    }
    next(err);
  }
});

stackRouter.delete("/stack/:id", async (req, res, next) => {
  try {
    await prisma.stackItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (isRecordNotFoundError(err)) {
      res.status(404).json({ error: "stack item not found" });
      return;
    }
    next(err);
  }
});

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002";
}

function isRecordNotFoundError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2025";
}
