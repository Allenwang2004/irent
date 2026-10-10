import Link from "next/link";
import { Suspense } from "react";
import {
  ALERT_KIND_LABELS,
  listWorkOrders,
  type WorkOrder,
  WORK_ORDER_KIND_LABELS,
  WORK_ORDER_STATUS_LABELS,
} from "@/lib/alerts";
import { requireSession } from "@/lib/auth";
import { VEHICLE_STATUS_LABELS, type VehicleStatus } from "@/lib/vehicles";
import { AutoRefresh } from "../auto-refresh";
import { buttonClass, Empty, formatTime, PageHeader, primaryButtonClass, selectClass, Tabs } from "../ui";
import { closeWorkOrder } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function WorkOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={15} />
      <PageHeader
        title="工單"
        subtitle="由預警自動建立：車內髒汙要清潔、高嚴重度車損要檢修，這兩種會讓車輛暫停出租，全部完成後自動恢復可借用；缺卡片與遺留物要聯絡用戶。"
      />
      <Suspense fallback={<p className="text-sm text-ink-3">載入中...</p>}>
        <WorkOrdersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function WorkOrdersContent({ searchParams }: { searchParams: SearchParams }) {
  await requireSession();
  const showClosed = (await searchParams).status === "closed";
  const orders = showClosed
    ? (await listWorkOrders({ limit: 100 })).filter((o) => o.status !== "open")
    : await listWorkOrders({ status: "open" });

  return (
    <>
      <Tabs
        current={showClosed ? "closed" : "open"}
        items={[
          { key: "open", label: "進行中", href: "/work-orders" },
          { key: "closed", label: "已完成／已取消", href: "/work-orders?status=closed" },
        ]}
      />
      {orders.length === 0 ? (
        <Empty>{showClosed ? "沒有紀錄" : "沒有進行中的工單"}</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </ul>
      )}
    </>
  );
}

const DONE_LABEL = { cleaning: "清潔完成", repair: "檢修完成", contact_renter: "已聯絡" } as const;

function OrderCard({ order: o }: { order: WorkOrder }) {
  return (
    <li className={`rounded-lg border bg-surface-1 p-4 ${o.blocks_rental && o.status === "open" ? "border-accent" : "border-line"}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold">{WORK_ORDER_KIND_LABELS[o.kind]}</span>
        {o.vehicle && (
          <Link href={`/vehicles/${o.vehicle.id}`} className="text-accent hover:underline">
            {o.vehicle.plate}
          </Link>
        )}
        {o.vehicle && (
          <span className="text-sm text-ink-2">車輛{VEHICLE_STATUS_LABELS[o.vehicle.status as VehicleStatus] ?? o.vehicle.status}</span>
        )}
        {o.blocks_rental && o.status === "open" && <span className="text-sm">暫停出租中</span>}
        <span className="ml-auto text-sm text-ink-3">
          {WORK_ORDER_STATUS_LABELS[o.status]}・{formatTime(o.created_at)} 建立
        </span>
      </div>
      {o.alert && (
        <p className="mt-1 text-sm text-ink-2">
          {ALERT_KIND_LABELS[o.alert.kind]}：{o.alert.message}
        </p>
      )}
      {o.status === "open" ? (
        <form action={closeWorkOrder} className="mt-3 flex flex-wrap gap-2 text-sm">
          <input type="hidden" name="id" value={o.id} />
          <input name="note" maxLength={500} placeholder="處理紀錄（選填）" className={`${selectClass} min-w-48 flex-1`} />
          <button type="submit" name="status" value="done" className={primaryButtonClass}>
            {DONE_LABEL[o.kind]}
          </button>
          <button type="submit" name="status" value="cancelled" className={buttonClass}>
            取消工單
          </button>
        </form>
      ) : (
        <p className="mt-2 text-sm text-ink-3">
          {formatTime(o.closed_at)} {WORK_ORDER_STATUS_LABELS[o.status]}
          {o.note ? `・${o.note}` : ""}
        </p>
      )}
    </li>
  );
}
