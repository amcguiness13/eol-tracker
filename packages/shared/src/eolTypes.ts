/**
 * Shapes returned by the endoflife.date v1 API (https://endoflife.date/api/v1).
 * Verified against live responses on 2026-07-17. The API is in beta and fields
 * marked optional here are genuinely absent for some product categories
 * (e.g. hardware/device products use isDiscontinued/discontinuedFrom instead
 * of isEoas/eoasFrom).
 */

export interface EolProductSummary {
  name: string;
  aliases: string[];
  label: string;
  category: string;
  tags: string[];
  uri: string;
}

export interface EolProductsResponse {
  schema_version: string;
  generated_at: string;
  total: number;
  result: EolProductSummary[];
}

export interface EolLatest {
  name: string;
  date?: string | null;
  link?: string | null;
}

export interface EolCycle {
  name: string;
  codename?: string | null;
  label: string;
  releaseDate?: string | null;
  isLts?: boolean | null;
  ltsFrom?: string | null;
  /** End of Active Support — distinct, earlier "support end" milestone than full EOL. */
  isEoas?: boolean | null;
  eoasFrom?: string | null;
  isEol: boolean;
  eolFrom?: string | null;
  /** Expanded Security Maintenance, only present for some products (e.g. Ubuntu). */
  isEoes?: boolean | null;
  eoesFrom?: string | null;
  /** Used instead of EOAS by hardware/device products. */
  isDiscontinued?: boolean | null;
  discontinuedFrom?: string | null;
  isMaintained?: boolean | null;
  latest?: EolLatest | null;
  custom?: Record<string, unknown> | null;
}

export interface EolProductDetailResult {
  name: string;
  aliases: string[];
  label: string;
  category: string;
  tags: string[];
  releases: EolCycle[];
}

export interface EolProductDetail {
  schema_version: string;
  generated_at: string;
  result: EolProductDetailResult;
}

export interface EolTaxonomyEntry {
  name: string;
  uri: string;
}

export interface EolCategoriesResponse {
  schema_version: string;
  total: number;
  result: EolTaxonomyEntry[];
}

export interface EolTagsResponse {
  schema_version: string;
  total: number;
  result: EolTaxonomyEntry[];
}
