import type {
  EolCategoriesResponse,
  EolProductDetail,
  EolProductsResponse,
  EolTagsResponse,
} from "@eol-tracker/shared";

const BASE_URL = "https://endoflife.date/api/v1";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`endoflife.date API request failed: ${res.status} ${res.statusText} (${path})`);
  }
  return (await res.json()) as T;
}

/** Thin, uncached HTTP wrappers for the endoflife.date v1 API. No caching logic lives here. */
export const eolClient = {
  listProducts: () => getJson<EolProductsResponse>("/products"),
  getProduct: (slug: string) => getJson<EolProductDetail>(`/products/${encodeURIComponent(slug)}`),
  listCategories: () => getJson<EolCategoriesResponse>("/categories"),
  listTags: () => getJson<EolTagsResponse>("/tags"),
};
