export interface CacheRecord {
  payload: string;
  fetchedAt: Date;
  expiresAt: Date;
}

/** Storage abstraction so the TTL logic can be unit-tested without a real database. */
export interface CacheStore {
  get(key: string): Promise<CacheRecord | null>;
  set(key: string, payload: string, fetchedAt: Date, expiresAt: Date): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface EolCacheOptions {
  store: CacheStore;
  ttlMs: number;
  now?: () => Date;
}

export interface EolCache {
  /** Returns the cached value if still fresh, otherwise calls fetcher and caches the result. */
  getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T>;
  /** Drops a cache entry so the next getCached call re-fetches, regardless of TTL. */
  invalidate(key: string): Promise<void>;
}

export function createEolCache({ store, ttlMs, now = () => new Date() }: EolCacheOptions): EolCache {
  async function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = await store.get(key);
    const current = now();
    if (existing && existing.expiresAt.getTime() > current.getTime()) {
      return JSON.parse(existing.payload) as T;
    }

    const fresh = await fetcher();
    const expiresAt = new Date(current.getTime() + ttlMs);
    await store.set(key, JSON.stringify(fresh), current, expiresAt);
    return fresh;
  }

  async function invalidate(key: string): Promise<void> {
    await store.delete(key);
  }

  return { getCached, invalidate };
}
