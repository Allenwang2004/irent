import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSupabase } from "@/lib/supabase";
import { CancelPickupButton } from "./cancel-pickup-button";

type VehicleRow = { id: number; plate: string; car_model: string; status: "available" | "in_use" };
type RentalRow = { id: number; vehicle_id: number; order_no: string; status: "picking_up" | "in_use" };

export default function Home() {
  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      <h1 className="text-2xl font-semibold">選擇車輛</h1>
      <p className="mt-1 text-sm text-ink-2">展示用：只有已在後台登錄完成的車會出現在這裡。</p>
      <Suspense fallback={<p className="mt-6 text-sm text-ink-3">載入中...</p>}>
        <VehicleList />
      </Suspense>
    </main>
  );
}

async function VehicleList() {
  await connection();
  const supabase = getSupabase();
  const [{ data: vehicles, error }, { data: rentals, error: rentalError }] = await Promise.all([
    supabase.from("vehicles").select("id, plate, car_model, status").in("status", ["available", "in_use"]).order("plate"),
    supabase.from("rentals").select("id, vehicle_id, order_no, status").in("status", ["picking_up", "in_use"]),
  ]);
  if (error) throw new Error(error.message);
  if (rentalError) throw new Error(rentalError.message);
  const openRental = new Map(((rentals ?? []) as RentalRow[]).map((r) => [r.vehicle_id, r]));
  const list = (vehicles ?? []) as VehicleRow[];

  if (list.length === 0) {
    return <p className="mt-6 text-sm text-ink-3">目前沒有可借的車。請先在營運後台新增車輛並完成登錄。</p>;
  }
  return (
    <ul className="mt-6 flex flex-col gap-3">
      {list.map((v) => {
        const rental = openRental.get(v.id);
        return (
          <li key={v.id} className="rounded-xl border border-line p-4">
            <div className="text-lg font-semibold">{v.plate}</div>
            <div className="text-sm text-ink-2">
              {v.car_model}・
              {v.status === "available" ? "可借用" : rental?.status === "picking_up" ? "取車中" : "租用中"}
            </div>
            {rental && <div className="text-xs text-ink-3">訂單 {rental.order_no}</div>}
            {v.status === "available" && (
              <Link
                href={`/pickup/${v.id}`}
                className="mt-4 block rounded-full bg-accent py-3 text-center font-medium text-accent-ink"
              >
                我要取車
              </Link>
            )}
            {rental?.status === "in_use" && (
              <Link
                href={`/return/${rental.id}`}
                className="mt-4 block rounded-full bg-accent py-3 text-center font-medium text-accent-ink"
              >
                我要還車
              </Link>
            )}
            {rental?.status === "picking_up" && <CancelPickupButton rentalId={rental.id} />}
          </li>
        );
      })}
    </ul>
  );
}
