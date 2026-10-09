import Link from "next/link";
import { VERDICT_LABELS } from "@/lib/inspections";

export function formatTime(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export const selectClass = "rounded border border-line bg-surface-1 px-2 py-1.5 text-sm";
export const buttonClass = "rounded border border-line px-3 py-1.5 text-sm hover:bg-surface-2";
export const primaryButtonClass = "rounded bg-accent px-3 py-1.5 text-sm font-medium text-white";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-line bg-surface-1 p-6 text-center text-sm text-ink-3">{children}</p>
  );
}

export function Tabs({ items, current }: { items: { href: string; label: string; key: string }[]; current: string }) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={`rounded-full border px-3 py-1 ${
            t.key === current ? "border-accent bg-accent text-white" : "border-line text-ink-2 hover:bg-surface-2"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

// A photo thumbnail that opens the full image; caption and optional verdict below.
export function PhotoTile({
  url,
  label,
  caption,
}: {
  url: string | null;
  label: string;
  caption?: React.ReactNode;
}) {
  return (
    <div className="text-xs">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" title="開啟原圖">
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
          <img src={url} alt={`${label}照片`} className="aspect-[3/4] w-full rounded bg-surface-2 object-cover" />
        </a>
      ) : (
        <div className="flex aspect-[3/4] items-center justify-center rounded bg-surface-2 text-ink-3">無照片</div>
      )}
      <div className="mt-1 truncate font-medium">{label}</div>
      {caption && <div className="text-ink-3">{caption}</div>}
    </div>
  );
}

export function verdictText(verdict: string) {
  return VERDICT_LABELS[verdict] ?? verdict;
}
