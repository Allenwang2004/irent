import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getRentalInUse, hasLockedReturn } from "@/lib/vehicles";
import { AppBar } from "../../app-bar";
import { CarArt } from "../../car-art";
import { Unavailable } from "../../unavailable";
import { ElapsedTime, StartReturnButton } from "./in-use";

type Params = Promise<{ rentalId: string }>;

// iRent's 用車頁. Only "start return" does anything in the demo; the rest of
// the page is there so the flow looks like the real app.
export default function RentalPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-ink-3">載入中...</p>}>
      <RentalContent params={params} />
    </Suspense>
  );
}

const SHORTCUTS = ["車況回報", "教學影片", "操作教學", "臨時停車", "開關門卡", "配對裝置", "租車合約", "行車紀錄"];

async function RentalContent({ params }: { params: Params }) {
  const id = Number((await params).rentalId);
  if (!Number.isInteger(id)) notFound();
  const rental = await getRentalInUse(id);
  if (!rental?.vehicle) notFound();
  if (rental.status !== "in_use") {
    return <Unavailable message="這筆租用已經還車或尚未完成取車。" />;
  }
  const locked = await hasLockedReturn(rental.id);
  return (
    <main className="flex flex-1 flex-col bg-surface-0">
      <AppBar title="用車中" back="/" />
      <div className="flex flex-1 flex-col px-4 py-5">
        <section className="rounded-xl bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-ink-2">同站</span>
              <div className="mt-2 text-2xl font-semibold">{rental.vehicle.plate}</div>
              <div className="text-sm text-ink-2">{rental.vehicle.car_model}</div>
            </div>
            <CarArt className="w-32" />
          </div>
          <div className="mt-4 text-center">
            <div className="text-xs text-ink-3">已使用時間</div>
            {rental.pickedUpAt ? (
              <ElapsedTime since={rental.pickedUpAt} />
            ) : (
              <div className="text-2xl font-semibold tabular-nums">--:--:--</div>
            )}
          </div>
        </section>

        <section className="mt-3 divide-y divide-line rounded-xl bg-surface-1 text-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-xs text-ink-3">訂單編號</div>
              <div>{rental.orderNo}</div>
            </div>
            <span className="text-ink-3">延長申請</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-xs text-ink-3">還車站點</div>
              <div>iRent 示範站（同站還車）</div>
            </div>
            <span className="text-ink-3">導航</span>
          </div>
        </section>

        <ul className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-surface-1 p-3 text-center text-xs text-ink-2">
          {SHORTCUTS.map((s) => (
            <li key={s} className="rounded-lg py-3">
              {s}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-6">
          {locked ? (
            <p className="rounded-xl bg-surface-1 p-4 text-center text-sm text-ink-2">
              車門已經鎖上，但外部照片沒有完成。請聯絡客服協助完成還車。
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <span className="rounded-full border border-line bg-surface-1 py-3 text-center text-sm text-ink-3">開車門</span>
              <StartReturnButton rentalId={rental.id} />
            </div>
          )}
          <Link href="/history" className="mt-3 block text-center text-sm text-ink-2">
            歷史訂單
          </Link>
        </div>
      </div>
    </main>
  );
}
