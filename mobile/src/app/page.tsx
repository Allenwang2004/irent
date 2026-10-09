import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSupabase } from "@/lib/supabase";

type Rental = { id: number; order_no: string; plate: string; car_model: string };

export default function Home() {
  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      <h1 className="text-2xl font-semibold">我的訂單</h1>
      <p className="mt-1 text-sm text-ink-2">展示用的模擬訂單，選一筆開始還車拍照。</p>
      <Suspense fallback={<p className="mt-6 text-sm text-ink-3">載入中...</p>}>
        <RentalList />
      </Suspense>
    </main>
  );
}

async function RentalList() {
  await connection();
  const { data, error } = await getSupabase()
    .from("rentals")
    .select("id, order_no, plate, car_model")
    .order("id");
  if (error) throw new Error(error.message);
  const rentals = (data ?? []) as Rental[];

  if (rentals.length === 0) {
    return <p className="mt-6 text-sm text-ink-3">目前沒有訂單。</p>;
  }
  return (
    <ul className="mt-6 flex flex-col gap-3">
      {rentals.map((r) => (
        <li key={r.id} className="rounded-xl border border-line p-4">
          <div className="text-xs text-ink-3">訂單 {r.order_no}</div>
          <div className="mt-1 text-lg font-semibold">{r.plate}</div>
          <div className="text-sm text-ink-2">{r.car_model}・租用中</div>
          <Link
            href={`/return/${r.id}`}
            className="mt-4 block rounded-full bg-accent py-3 text-center font-medium text-accent-ink"
          >
            我要還車
          </Link>
        </li>
      ))}
    </ul>
  );
}
