import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { type HistoryRental, listHistory, type ReceiptSummary } from "@/lib/history";
import { AutoRefresh } from "../auto-refresh";

export const metadata = { title: "歷史訂單 | iRent 取還車模擬" };

export default function HistoryPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      <Link href="/" className="text-sm text-ink-2">
        回到首頁
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">歷史訂單</h1>
      <p className="mt-1 text-sm text-ink-2">每筆訂單的取車確認與還車確認，包含當時拍的照片與 AI 檢查結果。</p>
      <Suspense fallback={<p className="mt-6 text-sm text-ink-3">載入中...</p>}>
        <HistoryList />
      </Suspense>
    </main>
  );
}

const STATUS = { picking_up: "取車中", in_use: "租用中", returned: "已還車" } as const;

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

async function HistoryList() {
  await connection();
  const rentals = await listHistory();
  if (rentals.length === 0) {
    return <p className="mt-6 text-sm text-ink-3">還沒有訂單。</p>;
  }
  const checking = rentals.some((r) => r.pickup?.state === "checking" || r.return?.state === "checking");
  return (
    <>
      {checking && <AutoRefresh seconds={5} />}
      <ul className="mt-6 flex flex-col gap-3">
        {rentals.map((r) => (
          <RentalCard key={r.id} rental={r} />
        ))}
      </ul>
    </>
  );
}

function RentalCard({ rental: r }: { rental: HistoryRental }) {
  return (
    <li className="rounded-xl border border-line p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-semibold">{r.plate}</span>
        <span className="text-sm text-ink-2">{STATUS[r.status]}</span>
      </div>
      <div className="text-sm text-ink-2">{r.carModel}</div>
      <div className="text-xs text-ink-3">
        訂單 {r.orderNo}・{formatTime(r.startedAt)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ReceiptLink label="取車確認" receipt={r.pickup} />
        <ReceiptLink label="還車確認" receipt={r.return} />
      </div>
      {r.status === "in_use" && (
        <Link href={`/return/${r.id}`} className="mt-3 block rounded-full bg-accent py-2.5 text-center text-sm font-medium text-accent-ink">
          我要還車
        </Link>
      )}
    </li>
  );
}

const STATE = {
  checking: { text: "AI 檢查中", dot: "bg-warning" },
  clear: { text: "沒有異常", dot: "bg-good" },
  attention: { text: "", dot: "bg-critical" },
  failed: { text: "人工確認中", dot: "bg-warning" },
} as const;

function ReceiptLink({ label, receipt }: { label: string; receipt: ReceiptSummary | null }) {
  if (!receipt) {
    return (
      <div className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-3">
        <div className="font-medium">{label}</div>
        <div className="text-xs">尚未完成</div>
      </div>
    );
  }
  const s = STATE[receipt.state];
  return (
    <Link href={`/records/${receipt.id}`} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-2">
      <div className="font-medium">{label}</div>
      <div className="flex items-center gap-1.5 text-xs text-ink-2">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
        {receipt.state === "attention" ? `${receipt.openFindings} 項需留意` : s.text}
      </div>
    </Link>
  );
}
