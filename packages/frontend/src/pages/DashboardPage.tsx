import { useEffect, useMemo, useState } from "react";
import type { StackItemWithStatus } from "@eol-tracker/shared";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatDaysRemaining } from "../lib/format";

type SortKey = "urgency" | "category" | "environment" | "product";

export function DashboardPage() {
  const [items, setItems] = useState<StackItemWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("urgency");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [environmentFilter, setEnvironmentFilter] = useState("");

  function load() {
    setLoading(true);
    setError(null);
    api
      .getDashboard()
      .then((r) => setItems(r.result))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      await api.refresh();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter((c): c is string => Boolean(c)))).sort(),
    [items]
  );
  const environments = useMemo(() => Array.from(new Set(items.map((i) => i.environment))).sort(), [items]);

  const visibleItems = useMemo(() => {
    let filtered = items;
    if (statusFilter) filtered = filtered.filter((i) => i.status.status === statusFilter);
    if (categoryFilter) filtered = filtered.filter((i) => i.category === categoryFilter);
    if (environmentFilter) filtered = filtered.filter((i) => i.environment === environmentFilter);

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "urgency": {
          const aDays = a.status.daysRemaining ?? Number.POSITIVE_INFINITY;
          const bDays = b.status.daysRemaining ?? Number.POSITIVE_INFINITY;
          return aDays - bDays;
        }
        case "category":
          return (a.category ?? "").localeCompare(b.category ?? "");
        case "environment":
          return a.environment.localeCompare(b.environment);
        case "product":
          return a.product.localeCompare(b.product);
        default:
          return 0;
      }
    });
    return sorted;
  }, [items, sortKey, statusFilter, categoryFilter, environmentFilter]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-toolbar">
        <h2>Dashboard</h2>
        <button type="button" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh from endoflife.date"}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <div className="dashboard-filters">
            <label>
              Sort by
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                <option value="urgency">Urgency (days until EOL)</option>
                <option value="category">Category</option>
                <option value="environment">Environment</option>
                <option value="product">Product</option>
              </select>
            </label>
            <label>
              Status
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="supported">Supported</option>
                <option value="approaching">Approaching EOL</option>
                <option value="eol">End of Life</option>
              </select>
            </label>
            <label>
              Category
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Environment
              <select value={environmentFilter} onChange={(e) => setEnvironmentFilter(e.target.value)}>
                <option value="">All</option>
                {environments.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {visibleItems.length === 0 ? (
            <p>No stack items match. Add some from the Selector or Import pages.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Product</th>
                  <th>Cycle</th>
                  <th>Category</th>
                  <th>Environment</th>
                  <th>Owner</th>
                  <th>EOL date</th>
                  <th>Days remaining</th>
                  <th>Support end date</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <StatusBadge status={item.status.status} />
                    </td>
                    <td>{item.product}</td>
                    <td>{item.label}</td>
                    <td>{item.category ?? "—"}</td>
                    <td>{item.environment}</td>
                    <td>{item.owner ?? "—"}</td>
                    <td>{formatDate(item.status.eolDate)}</td>
                    <td>{formatDaysRemaining(item.status.daysRemaining)}</td>
                    <td>
                      {item.status.supportEndDate && item.status.supportEndDate !== item.status.eolDate
                        ? `${formatDate(item.status.supportEndDate)} (${formatDaysRemaining(item.status.daysUntilSupportEnd)})`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
