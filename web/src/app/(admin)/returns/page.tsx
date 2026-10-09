import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { IMAGE_TYPE_LABELS, listReturns, type ReturnSession } from "@/lib/returns";

const LABELS = new Map(IMAGE_TYPE_LABELS);

export default function ReturnsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">還車照片</h1>
        <p className="mt-1 text-sm text-ink-2">
          用戶在還車時上傳的照片，以及手機端即時品質檢查的結果（最近 30 筆）
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-ink-3">載入中...</p>}>
        <ReturnsContent />
      </Suspense>
    </div>
  );
}

async function ReturnsContent() {
  await requireSession();
  const sessions = await listReturns();
  if (sessions.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface-1 p-6 text-center text-sm text-ink-3">
        還沒有送出的還車紀錄
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {sessions.map((s) => (
        <ReturnCard key={s.id} session={s} />
      ))}
    </ul>
  );
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function ReturnCard({ session: s }: { session: ReturnSession }) {
  const rejected = s.photos.reduce((n, p) => n + p.rejected_shots, 0);
  const warned = s.photos.filter((p) => p.verdict === "warn").length;
  return (
    <li className="rounded-lg border border-line bg-surface-1 p-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-lg font-semibold">{s.rental?.plate ?? "未知車輛"}</span>
        <span className="text-sm text-ink-2">{s.rental?.car_model}</span>
        <span className="text-sm text-ink-3">訂單 {s.rental?.order_no}</span>
        <span className="text-sm text-ink-3">{formatTime(s.submitted_at)}</span>
      </div>
      <p className="mt-1 text-sm text-ink-2">
        拍照時攔下 {rejected} 張不合格照片，{warned} 張有提醒但用戶仍使用
      </p>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {s.photos.map((p) => (
          <li key={p.image_type} className="text-xs">
            {p.url ? (
              <a href={p.url} target="_blank" rel="noreferrer" title="開啟原圖">
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                <img
                  src={p.url}
                  alt={`${LABELS.get(p.image_type) ?? p.image_type}照片`}
                  className="aspect-[3/4] w-full rounded bg-surface-2 object-cover"
                />
              </a>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded bg-surface-2 text-ink-3">
                無法載入
              </div>
            )}
            <div className="mt-1 flex justify-between">
              <span className="font-medium">{LABELS.get(p.image_type) ?? p.image_type}</span>
              <span className={p.verdict === "warn" ? "text-ink" : "text-ink-3"}>
                {p.verdict === "warn" ? "有提醒" : "清楚"}
              </span>
            </div>
            {p.rejected_shots > 0 && <div className="text-ink-3">重拍 {p.rejected_shots} 次</div>}
          </li>
        ))}
      </ul>
    </li>
  );
}
