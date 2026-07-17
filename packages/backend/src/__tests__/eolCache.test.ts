import { describe, expect, it, vi } from "vitest";
import { createEolCache, type CacheRecord, type CacheStore } from "../eol/eolCache.js";

function createInMemoryStore(): CacheStore {
  const rows = new Map<string, CacheRecord>();
  return {
    async get(key) {
      return rows.get(key) ?? null;
    },
    async set(key, payload, fetchedAt, expiresAt) {
      rows.set(key, { payload, fetchedAt, expiresAt });
    },
    async delete(key) {
      rows.delete(key);
    },
  };
}

describe("eolCache", () => {
  it("calls the fetcher and caches the result on a cold key", async () => {
    const store = createInMemoryStore();
    const cache = createEolCache({ store, ttlMs: 1000 });
    const fetcher = vi.fn().mockResolvedValue({ hello: "world" });

    const result = await cache.getCached("k", fetcher);

    expect(result).toEqual({ hello: "world" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("returns the cached value without calling the fetcher again while fresh", async () => {
    const store = createInMemoryStore();
    const cache = createEolCache({ store, ttlMs: 60_000 });
    const fetcher = vi.fn().mockResolvedValue({ hello: "world" });

    await cache.getCached("k", fetcher);
    const second = await cache.getCached("k", fetcher);

    expect(second).toEqual({ hello: "world" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches once the TTL has expired", async () => {
    const store = createInMemoryStore();
    let currentTime = new Date("2026-01-01T00:00:00Z");
    const cache = createEolCache({ store, ttlMs: 1000, now: () => currentTime });
    const fetcher = vi.fn().mockResolvedValueOnce({ v: 1 }).mockResolvedValueOnce({ v: 2 });

    const first = await cache.getCached("k", fetcher);
    currentTime = new Date(currentTime.getTime() + 2000); // advance past the 1000ms TTL
    const second = await cache.getCached("k", fetcher);

    expect(first).toEqual({ v: 1 });
    expect(second).toEqual({ v: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not refetch exactly at the TTL boundary edge before expiry", async () => {
    const store = createInMemoryStore();
    let currentTime = new Date("2026-01-01T00:00:00Z");
    const cache = createEolCache({ store, ttlMs: 1000, now: () => currentTime });
    const fetcher = vi.fn().mockResolvedValue({ v: 1 });

    await cache.getCached("k", fetcher);
    currentTime = new Date(currentTime.getTime() + 999); // still within TTL
    await cache.getCached("k", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps separate cache entries per key", async () => {
    const store = createInMemoryStore();
    const cache = createEolCache({ store, ttlMs: 60_000 });
    const fetcherA = vi.fn().mockResolvedValue({ v: "a" });
    const fetcherB = vi.fn().mockResolvedValue({ v: "b" });

    const a = await cache.getCached("a", fetcherA);
    const b = await cache.getCached("b", fetcherB);

    expect(a).toEqual({ v: "a" });
    expect(b).toEqual({ v: "b" });
    expect(fetcherA).toHaveBeenCalledTimes(1);
    expect(fetcherB).toHaveBeenCalledTimes(1);
  });

  it("invalidate() forces the next call to refetch even if still within TTL", async () => {
    const store = createInMemoryStore();
    const cache = createEolCache({ store, ttlMs: 60_000 });
    const fetcher = vi.fn().mockResolvedValueOnce({ v: 1 }).mockResolvedValueOnce({ v: 2 });

    await cache.getCached("k", fetcher);
    await cache.invalidate("k");
    const result = await cache.getCached("k", fetcher);

    expect(result).toEqual({ v: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
