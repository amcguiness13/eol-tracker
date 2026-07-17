import { useEffect, useState } from "react";
import type { EolProductSummary } from "@eol-tracker/shared";
import { api } from "../api/client";

interface ProductBrowserProps {
  selectedProduct: string | null;
  onSelectProduct: (slug: string) => void;
}

export function ProductBrowser({ selectedProduct, onSelectProduct }: ProductBrowserProps) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [products, setProducts] = useState<EolProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listCategories().then((r) => setCategories(r.result)).catch(() => {});
    api.listTags().then((r) => setTags(r.result)).catch(() => {});
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      setError(null);
      api
        .listProducts({ q: q || undefined, category: category || undefined, tag: tag || undefined })
        .then((r) => setProducts(r.result))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [q, category, tag]);

  return (
    <div className="product-browser">
      <div className="product-browser-filters">
        <input
          type="text"
          placeholder="Search products..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading...</p>}

      <ul className="product-list">
        {products.map((p) => (
          <li key={p.name}>
            <button
              type="button"
              className={p.name === selectedProduct ? "product-row selected" : "product-row"}
              onClick={() => onSelectProduct(p.name)}
            >
              <span className="product-label">{p.label}</span>
              <span className="product-slug">{p.name}</span>
              <span className="product-category">{p.category}</span>
            </button>
          </li>
        ))}
        {!loading && products.length === 0 && <li className="empty">No products match.</li>}
      </ul>
    </div>
  );
}
