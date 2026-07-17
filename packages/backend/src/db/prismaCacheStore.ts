import type { CacheStore } from "../eol/eolCache.js";
import { prisma } from "./client.js";

export const prismaCacheStore: CacheStore = {
  async get(key) {
    const row = await prisma.eolCache.findUnique({ where: { key } });
    if (!row) return null;
    return { payload: row.payload, fetchedAt: row.fetchedAt, expiresAt: row.expiresAt };
  },

  async set(key, payload, fetchedAt, expiresAt) {
    await prisma.eolCache.upsert({
      where: { key },
      create: { key, payload, fetchedAt, expiresAt },
      update: { payload, fetchedAt, expiresAt },
    });
  },

  async delete(key) {
    await prisma.eolCache.deleteMany({ where: { key } });
  },
};
