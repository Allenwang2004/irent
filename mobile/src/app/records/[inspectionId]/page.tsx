import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { type Finding, getRecord } from "@/lib/records";
import { AutoRefresh } from "../../auto-refresh";

type Params = Promise<{ inspectionId: string }>;

// The renter's receipt for a pickup or return. The link is only shown to the
// renter after submitting; the id is an unguessable UUID.
export default function RecordPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-ink-3">載入中...</p>}>
      <RecordContent params={params} />
    </Suspense>
  );
}

const REVIEW = {
  pending: { label: "AI 初步判讀", className: "border-warning" },
  confirmed: { label: "營運人員已確認", className: "border-critical" },
  dismissed: { label: "營運人員確認沒有問題", className: "border-good" },
} as const;

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

async function RecordContent({ params }: { params: Params }) {
  await connection();
  const record = await getRecord((await params).inspectionId);
  if (!record) notFound();
  const name = record.kind === "pickup" ? "取車" : "還車";
  const open = record.findings.filter((f) => f.review !== "dismissed");

  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      {!record.analysisDone && !record.analysisFailed && <AutoRefresh seconds={5} />}
      {record.analysisDone && record.findings.some((f) => f.review === "pending") && <AutoRefresh seconds={30} />}
      <Link href="/" className="text-sm text-ink-2">
        回到首頁
      </Link>
      <h1 className="mt-4 text-xl font-semibold">{name}確認</h1>
      <p className="mt-1 text-sm text-ink-2">
        {record.plate}・{record.carModel}・{formatTime(record.submittedAt)}
      </p>

      <section className="mt-6 rounded-xl bg-surface-2 p-4" aria-live="polite">
        {!record.analysisDone ? (
          record.analysisFailed ? (
            <p className="text-sm">AI 暫時無法檢查這次的照片，營運人員會人工確認。照片已安全保存。</p>
          ) : (
            <p className="text-sm">AI 正在檢查照片，通常幾分鐘內完成，這個頁面會自動更新。</p>
          )
        ) : open.length === 0 ? (
          <p className="text-sm">
            {record.kind === "pickup"
              ? "取車時的車況已記錄，與這台車上一次的紀錄一致。"
              : "還車照片已檢查完成，沒有發現新的車損或異常。"}
          </p>
        ) : (
          <p className="text-sm">
            AI 檢查發現 {open.length} 項需要留意的地方。以下是初步判讀，以營運人員確認的結果為準。
          </p>
        )}
      </section>

      {record.findings.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {record.findings.map((f) => (
            <FindingCard key={f.title} finding={f} />
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-semibold">您上傳的照片（{record.photos.length} 張）</h2>
      <p className="mt-1 text-xs text-ink-3">這些照片是這次{name}的車況證明。</p>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {record.photos.map((p) => (
          <li key={p.slot} className="text-xs">
            {p.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
              <img src={p.url} alt={`${p.label}照片`} className="aspect-[3/4] w-full rounded-md bg-surface-2 object-cover" />
            ) : (
              <div className="aspect-[3/4] w-full rounded-md bg-surface-2" />
            )}
            <div className="mt-1 truncate">{p.label}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}

function FindingCard({ finding: f }: { finding: Finding }) {
  const r = REVIEW[f.review];
  return (
    <li className={`rounded-xl border-l-4 bg-surface-1 p-4 shadow-sm ${r.className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{f.title}</span>
        <span className="shrink-0 text-xs text-ink-3">{r.label}</span>
      </div>
      <p className="mt-1 text-sm text-ink-2">{f.text}</p>
    </li>
  );
}
