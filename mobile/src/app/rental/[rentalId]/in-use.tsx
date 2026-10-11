"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RETURN_LOCK_SECONDS } from "@/lib/inspection";
import { ReturnCar } from "../../icons";

export function ElapsedTime({ since }: { since: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  const total = now === null ? 0 : Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="mt-1 text-[34px] font-extrabold tabular-nums text-[#141516]">
      {now === null
        ? "-- : -- : --"
        : `${pad(Math.floor(total / 3600))} : ${pad(Math.floor(total / 60) % 60)} : ${pad(total % 60)}`}
    </div>
  );
}

// Demo only: a day after pickup, as iRent shows it ("12/25 (四) 18:00").
export function DueBack({ since }: { since: string }) {
  const due = new Date(Date.parse(since) + 24 * 3600 * 1000);
  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    weekday: "narrow",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(due);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return (
    <span className="text-irent-blue">
      {get("month")}/{get("day")} ({get("weekday")}) {get("hour")}:{get("minute")}
    </span>
  );
}

// Billing stops the moment the return starts, so ask first.
export function StartReturnButton({ rentalId }: { rentalId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const minutes = RETURN_LOCK_SECONDS / 60;
  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-16 shrink-0 flex-col items-center gap-1 text-xs text-[#4d4f52]"
      >
        <ReturnCar className="h-7 w-7 text-[#6b6d72]" />
        開始還車
      </button>
      {confirming && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-2xl bg-surface-1 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <p className="text-center font-medium">確定要還車嗎？</p>
            <p className="mt-1 text-center text-sm text-ink-2">
              計費會停在現在。請在 {minutes} 分鐘內拍完車內照片、下車並按「下一步」鎖門；超過時間會自動取消還車，這段時間照常計費。
            </p>
            <button
              type="button"
              onClick={() => router.push(`/return/${rentalId}?start=1`)}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-accent text-[15px] text-accent-ink"
            >
              確認還車
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="mt-2 flex h-12 w-full items-center justify-center rounded-full border border-line text-[15px]"
            >
              繼續用車
            </button>
          </div>
        </div>
      )}
    </>
  );
}
