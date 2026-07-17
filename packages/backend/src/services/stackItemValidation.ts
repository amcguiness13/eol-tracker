import { findCycle, getAllProducts, getProductDetail, productExists } from "../eol/eolService.js";
import { levenshtein } from "./levenshtein.js";

export interface ProductCycleValidationResult {
  ok: boolean;
  normalizedProduct: string;
  error?: string;
  suggestion?: string;
}

const MAX_SUGGESTION_DISTANCE = 3;

/** Finds the closest known product slug/alias/label to `input`, for "did you mean" hints. */
export async function suggestProduct(input: string): Promise<string | undefined> {
  const all = await getAllProducts();
  let best: { name: string; distance: number } | undefined;

  for (const product of all) {
    const candidates = [product.name, ...product.aliases];
    for (const candidate of candidates) {
      const distance = levenshtein(input, candidate.toLowerCase());
      if (!best || distance < best.distance) {
        best = { name: product.name, distance };
      }
    }
  }

  if (best && best.distance <= MAX_SUGGESTION_DISTANCE) {
    return best.name;
  }
  return undefined;
}

/** Validates a product slug + cycle name against the live/cached endoflife.date catalog. */
export async function validateProductCycle(
  productSlug: string,
  cycle: string
): Promise<ProductCycleValidationResult> {
  const normalizedProduct = productSlug.trim().toLowerCase();

  const exists = await productExists(normalizedProduct);
  if (!exists) {
    const suggestion = await suggestProduct(normalizedProduct);
    return {
      ok: false,
      normalizedProduct,
      error: `product '${productSlug}' not found`,
      suggestion,
    };
  }

  const detail = await getProductDetail(normalizedProduct);
  const cycleMatch = findCycle(detail, cycle.trim());
  if (!cycleMatch) {
    return {
      ok: false,
      normalizedProduct,
      error: `cycle '${cycle}' not valid for '${normalizedProduct}'`,
    };
  }

  return { ok: true, normalizedProduct };
}
