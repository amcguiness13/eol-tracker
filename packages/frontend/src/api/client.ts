import type {
  AppNotification,
  EolCycle,
  EolProductDetailResult,
  EolProductSummary,
  StackItem,
  StackItemInput,
  StackItemWithStatus,
  ThresholdConfig,
} from "@eol-tracker/shared";

const apiBase = import.meta.env.VITE_API_BASE || "https://eol-tracker.onrender.com";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error ?? `Request failed: ${res.status}`) as Error & {
      suggestion?: string;
      status?: number;
    };
    error.suggestion = body.suggestion;
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listProducts: (params: { q?: string; category?: string; tag?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.category) search.set("category", params.category);
    if (params.tag) search.set("tag", params.tag);
    const qs = search.toString();
    return request<{ result: EolProductSummary[] }>(`/products${qs ? `?${qs}` : ""}`);
  },
  getProduct: (slug: string) => request<{ result: EolProductDetailResult }>(`/products/${encodeURIComponent(slug)}`),
  listCategories: () => request<{ result: string[] }>("/categories"),
  listTags: () => request<{ result: string[] }>("/tags"),

  listStack: () => request<{ result: StackItem[] }>("/stack"),
  getDashboard: () => request<{ result: StackItemWithStatus[] }>("/dashboard"),
  refresh: () => request<{ result: { refreshedProducts: string[] } }>("/refresh", { method: "POST" }),

  listNotifications: (status?: string) =>
    request<{ result: AppNotification[] }>(`/notifications${status ? `?status=${status}` : ""}`),
  markNotificationRead: (id: string) => request<{ result: AppNotification }>(`/notifications/${id}/read`, { method: "POST" }),
  dismissNotification: (id: string) => request<{ result: AppNotification }>(`/notifications/${id}/dismiss`, { method: "POST" }),
  generateNotifications: () => request<{ result: { created: number } }>("/notifications/generate", { method: "POST" }),

  getGlobalThresholds: () => request<{ result: ThresholdConfig[] }>("/thresholds"),
  setGlobalThresholds: (days: number[]) =>
    request<{ result: ThresholdConfig[] }>("/thresholds", { method: "PUT", body: JSON.stringify({ days }) }),
  addStackItem: (input: StackItemInput) =>
    request<{ result: StackItem }>("/stack", { method: "POST", body: JSON.stringify(input) }),
  updateStackItem: (id: string, input: Partial<StackItemInput>) =>
    request<{ result: StackItem }>(`/stack/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteStackItem: (id: string) => request<void>(`/stack/${id}`, { method: "DELETE" }),
};

export type { EolCycle };
