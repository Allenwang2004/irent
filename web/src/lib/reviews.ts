import "server-only";
import categoryDefs from "./review-categories.json";
import { getSupabase } from "./supabase";

export const SOURCES = {
  google_play: "Google Play",
  app_store: "App Store",
  ptt: "PTT",
  dcard: "Dcard",
} as const;
export type Source = keyof typeof SOURCES;

export const STATUSES = {
  open: "未處理",
  discussing: "討論中",
  resolved: "已修正",
  ignored: "不處理",
} as const;
export type Status = keyof typeof STATUSES;

export const IMPORTANCE = {
  important: "重要",
  unimportant: "不重要",
  unmarked: "未標記",
} as const;
export type Importance = keyof typeof IMPORTANCE;

export const CATEGORIES: { key: string; label: string }[] = categoryDefs.map(({ key, label }) => ({
  key,
  label,
}));
export const UNCATEGORIZED = "none";
export const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label])),
  [UNCATEGORIZED]: "未分類",
};

export const PAGE_SIZE = 20;

export type Review = {
  id: number;
  source: Source;
  url: string | null;
  board: string | null;
  title: string | null;
  author: string | null;
  posted_at: string | null;
  rating: number | null;
  matched_keywords: string[];
  snippets: string[];
  content: string | null;
  comments: string | null;
  categories: string[];
  importance: Importance;
  status: Status;
  note: string | null;
};

export type ReviewFilters = {
  source?: Source;
  category?: string;
  importance?: Importance;
  status?: Status;
  rating?: number;
  q?: string;
  page: number;
};

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export function parseFilters(params: Record<string, string | string[] | undefined>): ReviewFilters {
  const rating = Number(params.rating);
  const page = Number(params.page);
  const q = typeof params.q === "string" ? params.q.trim() : "";
  return {
    source: pick(params.source, Object.keys(SOURCES) as Source[]),
    category: pick(params.category, [...CATEGORIES.map((c) => c.key), UNCATEGORIZED]),
    importance: pick(params.importance, Object.keys(IMPORTANCE) as Importance[]),
    status: pick(params.status, Object.keys(STATUSES) as Status[]),
    rating: rating >= 1 && rating <= 5 ? rating : undefined,
    q: q || undefined,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

// PostgREST filter strings treat these characters as syntax.
function sanitizeSearch(q: string) {
  return q.replace(/[,()%*\\]/g, " ").trim();
}

export async function listReviews(filters: ReviewFilters) {
  let query = getSupabase()
    .from("reviews")
    .select(
      "id, source, url, board, title, author, posted_at, rating, matched_keywords, snippets, content, comments, categories, importance, status, note",
      { count: "exact" },
    )
    .order("posted_at", { ascending: false, nullsFirst: false });

  if (filters.source) query = query.eq("source", filters.source);
  if (filters.importance) query = query.eq("importance", filters.importance);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.rating) query = query.eq("rating", filters.rating);
  if (filters.category === UNCATEGORIZED) query = query.eq("categories", "{}");
  else if (filters.category) query = query.contains("categories", [filters.category]);
  if (filters.q) {
    const q = sanitizeSearch(filters.q);
    if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
  }

  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return { reviews: (data ?? []) as Review[], total: count ?? 0 };
}

type StatRow = Pick<Review, "source" | "categories" | "rating" | "importance" | "status">;

// Stats follow the source and importance filters, so selecting "important"
// shows the problem breakdown of hand-picked reviews only.
export type StatScope = Pick<ReviewFilters, "source" | "importance">;

// Supabase caps a single response at 1000 rows, so page through.
async function fetchStatRows({ source, importance }: StatScope) {
  const rows: StatRow[] = [];
  const step = 1000;
  for (let from = 0; ; from += step) {
    let query = getSupabase()
      .from("reviews")
      .select("source, categories, rating, importance, status")
      .order("id")
      .range(from, from + step - 1);
    if (source) query = query.eq("source", source);
    if (importance) query = query.eq("importance", importance);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as StatRow[]));
    if (!data || data.length < step) return rows;
  }
}

export async function getReviewStats(scope: StatScope) {
  const rows = await fetchStatRows(scope);
  const bySource = Object.fromEntries(Object.keys(SOURCES).map((s) => [s, 0])) as Record<Source, number>;
  const byCategory: Record<string, number> = Object.fromEntries(
    [...CATEGORIES.map((c) => c.key), UNCATEGORIZED].map((k) => [k, 0]),
  );
  const byStatus = Object.fromEntries(Object.keys(STATUSES).map((s) => [s, 0])) as Record<Status, number>;
  const byImportance = Object.fromEntries(Object.keys(IMPORTANCE).map((s) => [s, 0])) as Record<Importance, number>;
  let ratingSum = 0;
  let ratingCount = 0;
  let lowRating = 0;

  for (const row of rows) {
    bySource[row.source] += 1;
    byStatus[row.status] += 1;
    byImportance[row.importance] += 1;
    if (row.categories.length === 0) byCategory[UNCATEGORIZED] += 1;
    for (const c of row.categories) if (c in byCategory) byCategory[c] += 1;
    if (row.rating) {
      ratingSum += row.rating;
      ratingCount += 1;
      if (row.rating <= 2) lowRating += 1;
    }
  }

  const categories = Object.entries(byCategory)
    .map(([key, count]) => ({ key, label: CATEGORY_LABELS[key], count }))
    // Keep "uncategorized" last regardless of size; it is not a problem theme.
    .sort((a, b) => (a.key === UNCATEGORIZED ? 1 : b.key === UNCATEGORIZED ? -1 : b.count - a.count));

  return {
    total: rows.length,
    bySource,
    byStatus,
    byImportance,
    categories,
    avgRating: ratingCount ? ratingSum / ratingCount : null,
    lowRatingShare: ratingCount ? lowRating / ratingCount : null,
    ratingCount,
  };
}
