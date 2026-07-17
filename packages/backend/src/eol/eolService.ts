import type { EolCycle, EolProductDetailResult, EolProductSummary } from "@eol-tracker/shared";
import { prismaCacheStore } from "../db/prismaCacheStore.js";
import { createEolCache } from "./eolCache.js";
import { eolClient } from "./eolClient.js";

const ttlMs = Number(process.env.CACHE_TTL_HOURS ?? 24) * 60 * 60 * 1000;
const cache = createEolCache({ store: prismaCacheStore, ttlMs });

const PRODUCTS_KEY = "products";
const CATEGORIES_KEY = "categories";
const TAGS_KEY = "tags";
const productKey = (slug: string) => `product:${slug}`;

export async function getAllProducts(): Promise<EolProductSummary[]> {
  const data = await cache.getCached(PRODUCTS_KEY, () => eolClient.listProducts());
  return data.result;
}

export async function getProductDetail(slug: string): Promise<EolProductDetailResult> {
  const normalized = slug.toLowerCase();
  const data = await cache.getCached(productKey(normalized), () => eolClient.getProduct(normalized));
  return data.result;
}

export async function getCategories(): Promise<string[]> {
  const data = await cache.getCached(CATEGORIES_KEY, () => eolClient.listCategories());
  return data.result.map((c) => c.name);
}

export async function getTags(): Promise<string[]> {
  const data = await cache.getCached(TAGS_KEY, () => eolClient.listTags());
  return data.result.map((t) => t.name);
}

export interface ProductSearchOptions {
  q?: string;
  category?: string;
  tag?: string;
}

export async function searchProducts(opts: ProductSearchOptions): Promise<EolProductSummary[]> {
  const all = await getAllProducts();
  return all.filter((p) => {
    if (opts.category && p.category !== opts.category) return false;
    if (opts.tag && !p.tags.includes(opts.tag)) return false;
    if (opts.q) {
      const q = opts.q.toLowerCase();
      const matches =
        p.name.includes(q) || p.label.toLowerCase().includes(q) || p.aliases.some((a) => a.toLowerCase().includes(q));
      if (!matches) return false;
    }
    return true;
  });
}

/** True if `slug` (case-insensitive) is a known product. */
export async function productExists(slug: string): Promise<boolean> {
  const all = await getAllProducts();
  const target = slug.toLowerCase();
  return all.some((p) => p.name.toLowerCase() === target);
}

/** Looks up a cycle by name (case-sensitive, matching the API's own cycle naming) for a product. */
export function findCycle(product: EolProductDetailResult, cycleName: string): EolCycle | undefined {
  return product.releases.find((r) => r.name === cycleName);
}

/** Refreshes the product list and every product currently referenced, bypassing TTL. */
export async function refreshCacheFor(slugs: string[]): Promise<void> {
  await cache.invalidate(PRODUCTS_KEY);
  await getAllProducts();
  for (const slug of slugs) {
    const normalized = slug.toLowerCase();
    await cache.invalidate(productKey(normalized));
    await getProductDetail(normalized);
  }
}
