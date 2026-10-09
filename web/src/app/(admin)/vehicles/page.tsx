import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { listVehicles, VEHICLE_STATUS_LABELS } from "@/lib/vehicles";
import { Empty, PageHeader } from "../ui";
import { CreateVehicleForm } from "./create-vehicle-form";

export default function VehiclesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="車輛"
        subtitle="新增車輛後，用手機開登錄連結拍攝基準照片，車輛才會出現在取車清單。"
      />
      <CreateVehicleForm />
      <Suspense fallback={<p className="text-sm text-ink-3">載入中...</p>}>
        <VehicleTable />
      </Suspense>
    </div>
  );
}

async function VehicleTable() {
  await requireSession();
  const vehicles = await listVehicles();
  if (vehicles.length === 0) return <Empty>還沒有車輛</Empty>;
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface-1">
      <table className="w-full text-sm">
        <thead className="text-left text-ink-3">
          <tr className="border-b border-line">
            <th className="px-4 py-2 font-normal">車牌</th>
            <th className="px-4 py-2 font-normal">車型</th>
            <th className="px-4 py-2 font-normal">狀態</th>
            <th className="px-4 py-2 font-normal">已知車損</th>
            <th className="px-4 py-2 font-normal">待處理預警</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id} className="border-b border-line last:border-0">
              <td className="px-4 py-2">
                <Link href={`/vehicles/${v.id}`} className="font-medium text-accent hover:underline">
                  {v.plate}
                </Link>
              </td>
              <td className="px-4 py-2">{v.car_model}</td>
              <td className="px-4 py-2">{VEHICLE_STATUS_LABELS[v.status]}</td>
              <td className="px-4 py-2 tabular-nums">{v.activeDamages}</td>
              <td className="px-4 py-2 tabular-nums">
                {v.openAlerts > 0 ? (
                  <Link href="/alerts" className="text-accent hover:underline">
                    {v.openAlerts}
                  </Link>
                ) : (
                  0
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
