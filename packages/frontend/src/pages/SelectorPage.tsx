import { useCallback, useEffect, useState } from "react";
import type { StackItem } from "@eol-tracker/shared";
import { api } from "../api/client";
import { ProductBrowser } from "../components/ProductBrowser";
import { CycleSelector } from "../components/CycleSelector";
import { StackTable } from "../components/StackTable";

export function SelectorPage() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [stack, setStack] = useState<StackItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refreshStack = useCallback(() => {
    api
      .listStack()
      .then((r) => setStack(r.result))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    refreshStack();
  }, [refreshStack]);

  async function handleRemove(id: string) {
    try {
      await api.deleteStackItem(id);
      refreshStack();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="selector-page">
      <h2>Build your architecture stack</h2>
      {error && <p className="error-text">{error}</p>}

      <div className="selector-layout">
        <ProductBrowser selectedProduct={selectedProduct} onSelectProduct={setSelectedProduct} />
        <div className="selector-detail">
          {selectedProduct ? (
            <CycleSelector productSlug={selectedProduct} onAdded={refreshStack} />
          ) : (
            <p>Select a product to choose a version.</p>
          )}
        </div>
      </div>

      <h3>Current stack ({stack.length})</h3>
      <StackTable items={stack} onRemove={handleRemove} />
    </div>
  );
}
