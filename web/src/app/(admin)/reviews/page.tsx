import Link from "next/link";
import { Suspense } from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  getReviewStats,
  IMPORTANCE,
  type Importance,
  listReviews,
  PAGE_SIZE,
  parseFilters,
  type Review,
  type ReviewFilters,
  SOURCES,
  STATUSES,
  UNCATEGORIZED,
} from "@/lib/reviews";
import { requireSession } from "@/lib/auth";
import { setReviewImportance, updateReviewTriage } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">顧客評論</h1>
        <p className="mt-1 text-sm text-ink-2">
          PTT、Dcard、Google Play、App Store 上與 iRent 還車相關的文章和評論
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-ink-3">載入中...</p>}>
        <ReviewsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ReviewsContent({ searchParams }: { searchParams: SearchParams }) {
  await requireSession();
  const filters = parseFilters(await searchParams);
  const [stats, { reviews, total }] = await Promise.all([
    getReviewStats({ source: filters.source, importance: filters.importance }),
    listReviews(filters),
  ]);

  return (
    <>
      <StatTiles stats={stats} filters={filters} />
      <CategoryChart stats={stats} filters={filters} />
      <FilterBar filters={filters} />
      <ReviewList reviews={reviews} total={total} filters={filters} />
    </>
  );
}

type Stats = Awaited<ReturnType<typeof getReviewStats>>;

function hrefWith(filters: ReviewFilters, overrides: Partial<ReviewFilters>) {
  const merged = { ...filters, page: 1, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === "" || (key === "page" && value === 1)) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `/reviews?${qs}` : "/reviews";
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function CountTile({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <div className="rounded-lg border border-line bg-surface-1 p-4">
      <div className="text-sm text-ink-2">{title}</div>
      <ul className="mt-1 space-y-0.5 text-sm tabular-nums">
        {rows.map((row) => (
          <li key={row.label} className="flex justify-between">
            <span className="text-ink-2">{row.label}</span>
            <span>{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatTiles({ stats, filters }: { stats: Stats; filters: ReviewFilters }) {
  const scope = [
    filters.source ? SOURCES[filters.source] : "全部來源",
    filters.importance ? `標為${IMPORTANCE[filters.importance]}` : null,
  ]
    .filter(Boolean)
    .join("、");
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <div className="col-span-2 rounded-lg border border-line bg-surface-1 p-4 md:col-span-1">
        <div className="text-sm text-ink-2">評論數（{scope}）</div>
        <div className="mt-1 text-5xl font-semibold">{stats.total.toLocaleString()}</div>
      </div>
      <div className="rounded-lg border border-line bg-surface-1 p-4">
        <div className="text-sm text-ink-2">App 評論平均星等</div>
        <div className="mt-1 text-2xl font-semibold">
          {stats.avgRating === null ? "-" : stats.avgRating.toFixed(1)}
        </div>
        <div className="text-xs text-ink-3">共 {stats.ratingCount} 則有星等</div>
      </div>
      <div className="rounded-lg border border-line bg-surface-1 p-4">
        <div className="text-sm text-ink-2">1 到 2 星比例</div>
        <div className="mt-1 text-2xl font-semibold">
          {stats.lowRatingShare === null ? "-" : formatPercent(stats.lowRatingShare)}
        </div>
        <div className="text-xs text-ink-3">只計 App 評論</div>
      </div>
      <CountTile
        title="重要程度"
        rows={Object.entries(IMPORTANCE).map(([key, label]) => ({
          label,
          count: stats.byImportance[key as Importance],
        }))}
      />
      <CountTile
        title="處理狀態"
        rows={Object.entries(STATUSES).map(([key, label]) => ({
          label,
          count: stats.byStatus[key as keyof typeof STATUSES],
        }))}
      />
    </section>
  );
}

function CategoryChart({ stats, filters }: { stats: Stats; filters: ReviewFilters }) {
  const max = Math.max(1, ...stats.categories.map((c) => c.count));
  return (
    <section className="rounded-lg border border-line bg-surface-1 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">問題分類</h2>
        <p className="text-xs text-ink-3">
          一則評論可能屬於多個分類，所以比例加總會超過 100%。點分類可篩選下方列表。
        </p>
      </div>
      <ul className="mt-4 flex flex-col gap-1">
        {stats.categories.map((c) => {
          const share = stats.total ? c.count / stats.total : 0;
          const active = filters.category === c.key;
          const dimmed = filters.category !== undefined && !active;
          return (
            <li key={c.key}>
              <Link
                href={hrefWith(filters, { category: active ? undefined : c.key })}
                title={`${c.label}：${c.count} 則，佔 ${formatPercent(share)}`}
                aria-current={active ? "true" : undefined}
                className="group grid grid-cols-1 items-center gap-x-3 gap-y-1 rounded px-2 py-1.5 hover:bg-surface-2 sm:grid-cols-[14rem_1fr]"
              >
                <span className={`text-sm ${active ? "font-semibold" : "text-ink-2"}`}>{c.label}</span>
                <span className="flex items-center gap-2">
                  <span
                    className={`h-5 rounded-r ${dimmed || c.key === UNCATEGORIZED ? "bg-bar-muted" : "bg-bar"}`}
                    style={{ width: `${(c.count / max) * 80}%`, minWidth: c.count ? 2 : 0 }}
                  />
                  <span className="shrink-0 text-xs tabular-nums text-ink-2">
                    {c.count} 則 · {formatPercent(share)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const selectClass = "rounded border border-line bg-surface-1 px-2 py-1.5 text-sm";

function FilterBar({ filters }: { filters: ReviewFilters }) {
  return (
    <form action="/reviews" className="flex flex-wrap items-end gap-2">
      <select name="source" defaultValue={filters.source ?? ""} className={selectClass} aria-label="來源">
        <option value="">全部來源</option>
        {Object.entries(SOURCES).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <select name="category" defaultValue={filters.category ?? ""} className={selectClass} aria-label="分類">
        <option value="">全部分類</option>
        {CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
        <option value={UNCATEGORIZED}>{CATEGORY_LABELS[UNCATEGORIZED]}</option>
      </select>
      <select name="rating" defaultValue={filters.rating ?? ""} className={selectClass} aria-label="星等">
        <option value="">全部星等</option>
        {[1, 2, 3, 4, 5].map((r) => (
          <option key={r} value={r}>{r} 星</option>
        ))}
      </select>
      <select name="importance" defaultValue={filters.importance ?? ""} className={selectClass} aria-label="重要程度">
        <option value="">全部重要程度</option>
        {Object.entries(IMPORTANCE).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <select name="status" defaultValue={filters.status ?? ""} className={selectClass} aria-label="處理狀態">
        <option value="">全部狀態</option>
        {Object.entries(STATUSES).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <input
        name="q"
        defaultValue={filters.q ?? ""}
        placeholder="搜尋標題或內文"
        className={`${selectClass} min-w-48 flex-1`}
      />
      <button type="submit" className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white">
        篩選
      </button>
      <Link href="/reviews" className="px-2 py-1.5 text-sm text-ink-2 hover:text-ink">
        清除
      </Link>
    </form>
  );
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlighted({ text, keywords }: { text: string; keywords: string[] }) {
  if (keywords.length === 0) return <>{text}</>;
  const re = new RegExp(`(${keywords.map(escapeRegExp).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-highlight px-0.5 text-ink">{part}</mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "日期不明";
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium" }).format(
    new Date(iso),
  );
}

function ReviewList({ reviews, total, filters }: { reviews: Review[]; total: number; filters: ReviewFilters }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-ink-2">
        符合條件 {total} 則，第 {filters.page} / {pages} 頁
      </p>
      {reviews.length === 0 && (
        <p className="rounded-lg border border-line bg-surface-1 p-6 text-center text-sm text-ink-3">
          沒有符合條件的評論
        </p>
      )}
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
      {pages > 1 && (
        <nav className="flex justify-between text-sm">
          {filters.page > 1 ? (
            <Link href={hrefWith(filters, { page: filters.page - 1 })} className="text-accent">上一頁</Link>
          ) : <span />}
          {filters.page < pages ? (
            <Link href={hrefWith(filters, { page: filters.page + 1 })} className="text-accent">下一頁</Link>
          ) : <span />}
        </nav>
      )}
    </section>
  );
}

// One click to mark; clicking the active choice again clears it.
function ImportanceToggle({ review: r }: { review: Review }) {
  const choices: Exclude<Importance, "unmarked">[] = ["important", "unimportant"];
  return (
    <div className="flex gap-1" role="group" aria-label="重要程度">
      {choices.map((choice) => {
        const active = r.importance === choice;
        return (
          <form key={choice} action={setReviewImportance}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="importance" value={active ? "unmarked" : choice} />
            <button
              type="submit"
              aria-pressed={active}
              className={`rounded border px-2.5 py-1 text-xs font-medium ${
                active
                  ? "border-accent bg-accent text-white"
                  : "border-line text-ink-2 hover:bg-surface-2"
              }`}
            >
              {IMPORTANCE[choice]}
            </button>
          </form>
        );
      })}
    </div>
  );
}

function ReviewCard({ review: r }: { review: Review }) {
  return (
    <article
      className={`rounded-lg border bg-surface-1 p-4 ${
        r.importance === "important" ? "border-accent" : "border-line"
      } ${r.importance === "unimportant" ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-medium text-ink">{SOURCES[r.source]}</span>
          {r.board && <span>{r.board}</span>}
          <span>{formatDate(r.posted_at)}</span>
          {r.rating && <span>{r.rating} 星</span>}
          {r.url && (
            <a href={r.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              原文
            </a>
          )}
        </div>
        <ImportanceToggle review={r} />
      </div>
      {r.title && <h3 className="mt-2 font-medium">{r.title}</h3>}
      <div className="mt-2 flex flex-wrap gap-1">
        {(r.categories.length ? r.categories : [UNCATEGORIZED]).map((c) => (
          <span key={c} className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-2">
            {CATEGORY_LABELS[c] ?? c}
          </span>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
        {r.snippets.slice(0, 3).map((s, i) => (
          <li key={i} className="border-l-2 border-line pl-3">
            <Highlighted text={s} keywords={r.matched_keywords} />
          </li>
        ))}
      </ul>
      {r.content && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-ink-2 hover:text-ink">看全文</summary>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{r.content}</p>
          {r.comments && (
            <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3 text-ink-2">{r.comments}</p>
          )}
        </details>
      )}
      {/* React resets the form after the action, and a select's defaultValue only
          applies on mount, so remount whenever the saved values change. */}
      <form key={`${r.status}:${r.note ?? ""}`} action={updateReviewTriage} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <input type="hidden" name="id" value={r.id} />
        <select name="status" defaultValue={r.status} className={selectClass} aria-label="處理狀態">
          {Object.entries(STATUSES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input
          name="note"
          defaultValue={r.note ?? ""}
          placeholder="團隊備註"
          className={`${selectClass} min-w-48 flex-1`}
        />
        <button type="submit" className="rounded border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
          儲存
        </button>
      </form>
    </article>
  );
}
