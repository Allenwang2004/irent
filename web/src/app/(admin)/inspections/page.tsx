import Link from "next/link";
import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { type Inspection, type InspectionKind, KIND_LABELS, listInspections, photoLabel } from "@/lib/inspections";
import { Empty, formatTime, PageHeader, PhotoTile, Tabs, verdictText } from "../ui";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const KINDS = Object.keys(KIND_LABELS) as InspectionKind[];

const ANALYSIS_STATUS: Record<string, string> = {
  pending: "等待分析",
  running: "分析中",
  done: "分析完成",
  error: "分析失敗",
};

export default function InspectionsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="取還車紀錄" subtitle="每次登錄、取車、還車送出的照片，以及手機端品質檢查和 VLM 分析的結果（最近 30 筆）。" />
      <Suspense fallback={<p className="text-sm text-ink-3">載入中...</p>}>
        <InspectionsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function InspectionsContent({ searchParams }: { searchParams: SearchParams }) {
  await requireSession();
  const params = await searchParams;
  const kind = KINDS.find((k) => k === params.kind);
  const vehicleId = Number(params.vehicle) || undefined;
  const inspections = await listInspections({ kind, vehicleId });

  const qs = (k?: InspectionKind) => {
    const p = new URLSearchParams();
    if (k) p.set("kind", k);
    if (vehicleId) p.set("vehicle", String(vehicleId));
    const s = p.toString();
    return s ? `/inspections?${s}` : "/inspections";
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          current={kind ?? "all"}
          items={[
            { key: "all", label: "全部", href: qs() },
            ...KINDS.map((k) => ({ key: k, label: KIND_LABELS[k], href: qs(k) })),
          ]}
        />
        {vehicleId && (
          <Link href={kind ? `/inspections?kind=${kind}` : "/inspections"} className="text-sm text-ink-2 hover:text-ink">
            顯示所有車輛
          </Link>
        )}
      </div>
      {inspections.length === 0 ? (
        <Empty>沒有紀錄</Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {inspections.map((i) => (
            <InspectionCard key={i.id} inspection={i} />
          ))}
        </ul>
      )}
    </>
  );
}

function InspectionCard({ inspection: i }: { inspection: Inspection }) {
  const rejected = i.photos.reduce((n, p) => n + p.rejected_shots, 0);
  const extras = i.photos.filter((p) => p.category === "extra").length;
  return (
    <li className="rounded-lg border border-line bg-surface-1 p-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="rounded-full border border-line px-2 py-0.5 text-sm">{KIND_LABELS[i.kind]}</span>
        {i.vehicle && (
          <Link href={`/vehicles/${i.vehicle.id}`} className="text-lg font-semibold hover:underline">
            {i.vehicle.plate}
          </Link>
        )}
        <span className="text-sm text-ink-2">{i.vehicle?.car_model}</span>
        {i.rental && <span className="text-sm text-ink-3">訂單 {i.rental.order_no}</span>}
        <span className="text-sm text-ink-3">{formatTime(i.submitted_at)}</span>
        {i.kind !== "registration" && (
          <span className="ml-auto text-sm text-ink-2" title={i.analysis_error ?? undefined}>
            {ANALYSIS_STATUS[i.analysis_status] ?? i.analysis_status}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-2">
        拍照時攔下 {rejected} 張不合格照片
        {i.kind !== "registration" && `，用戶${i.kind === "pickup" ? "回報其他損傷" : "自行回報損傷"} ${extras} 處`}
      </p>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
        {i.photos.map((p) => (
          <li key={p.id}>
            <PhotoTile
              url={p.url}
              label={photoLabel(p)}
              caption={
                <>
                  {p.analyses.map((a) => (
                    <span key={a.kind} className="block">
                      {verdictText(a.verdict)}
                    </span>
                  ))}
                  {p.note && <span className="block">「{p.note}」</span>}
                  {p.verdict === "warn" && <span className="block">畫質有提醒</span>}
                </>
              }
            />
          </li>
        ))}
      </ul>
    </li>
  );
}
