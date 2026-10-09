import Link from "next/link";
import { Suspense } from "react";
import {
  ALERT_KIND_LABELS,
  ALERT_STATUS_LABELS,
  type Alert,
  type AlertStatus,
  DAMAGE_ALERT_KINDS,
  listAlerts,
  SEVERITY_LABELS,
} from "@/lib/alerts";
import { requireSession } from "@/lib/auth";
import { DAMAGE_TYPES, KIND_LABELS, SEVERITIES } from "@/lib/inspections";
import { buttonClass, Empty, formatTime, PageHeader, PhotoTile, primaryButtonClass, selectClass, Tabs } from "../ui";
import { handleAlert, reopenAlert } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTERS: (AlertStatus | "all")[] = ["open", "confirmed", "dismissed", "all"];

export default function AlertsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="預警"
        subtitle="VLM worker 比對取車、還車照片後回報的狀況。確認車損時可以一併記錄到車輛的已知車損。"
      />
      <Suspense fallback={<p className="text-sm text-ink-3">載入中...</p>}>
        <AlertsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AlertsContent({ searchParams }: { searchParams: SearchParams }) {
  await requireSession();
  const raw = (await searchParams).status;
  const status = FILTERS.find((f) => f === raw) ?? "open";
  const alerts = await listAlerts(status);

  return (
    <>
      <Tabs
        current={status}
        items={FILTERS.map((f) => ({
          key: f,
          href: f === "open" ? "/alerts" : `/alerts?status=${f}`,
          label: f === "all" ? "全部" : ALERT_STATUS_LABELS[f],
        }))}
      />
      {alerts.length === 0 ? (
        <Empty>{status === "open" ? "沒有待處理的預警" : "沒有預警"}</Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </ul>
      )}
    </>
  );
}

function AlertCard({ alert: a }: { alert: Alert }) {
  const isDamage = DAMAGE_ALERT_KINDS.includes(a.kind);
  const firstItem = a.details.items?.[0];
  return (
    <li className={`rounded-lg border bg-surface-1 p-4 ${a.status === "open" && a.severity === "high" ? "border-accent" : "border-line"}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold">{ALERT_KIND_LABELS[a.kind] ?? a.kind}</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-xs">嚴重度 {SEVERITY_LABELS[a.severity]}</span>
        {a.vehicle && (
          <Link href={`/vehicles/${a.vehicle.id}`} className="text-sm text-accent hover:underline">
            {a.vehicle.plate}
          </Link>
        )}
        {a.inspection && (
          <span className="text-sm text-ink-2">
            {KIND_LABELS[a.inspection.kind]}・{formatTime(a.inspection.submitted_at)}
          </span>
        )}
        <span className="ml-auto text-sm text-ink-3">{ALERT_STATUS_LABELS[a.status]}</span>
      </div>
      <p className="mt-2 text-sm">{a.message}</p>

      {(a.photo || a.baseline) && (
        <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
          {a.baseline && <PhotoTile url={a.baseline.url} label="比對基準（上一次）" />}
          {a.photo && <PhotoTile url={a.photo.url} label={`這次：${a.photo.label}`} />}
        </div>
      )}

      {a.status === "open" ? (
        <form action={handleAlert} className="mt-4 flex flex-col gap-3 border-t border-line pt-3 text-sm">
          <input type="hidden" name="id" value={a.id} />
          {isDamage && (
            <fieldset className="flex flex-wrap items-end gap-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="record" value="1" defaultChecked />
                確認時記錄為這台車的已知車損
              </label>
              <input
                name="location"
                defaultValue={firstItem?.location ?? a.photo?.label.replace(/^(已知|回報)：/, "") ?? ""}
                maxLength={40}
                aria-label="車損位置"
                placeholder="位置"
                className={`${selectClass} w-40`}
              />
              <select name="damage_type" defaultValue={firstItem?.type ?? "刮傷"} aria-label="類型" className={selectClass}>
                {DAMAGE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <select name="severity" defaultValue={firstItem?.severity ?? "輕微"} aria-label="嚴重度" className={selectClass}>
                {SEVERITIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </fieldset>
          )}
          <div className="flex flex-wrap gap-2">
            <input name="note" maxLength={500} placeholder="處理備註（選填）" className={`${selectClass} min-w-48 flex-1`} />
            <button type="submit" name="decision" value="confirmed" className={primaryButtonClass}>
              確認
            </button>
            <button type="submit" name="decision" value="dismissed" className={buttonClass}>
              駁回（誤報）
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm text-ink-2">
          <span>{formatTime(a.handled_at)} 處理</span>
          {a.note && <span>備註：{a.note}</span>}
          <form action={reopenAlert} className="ml-auto">
            <input type="hidden" name="id" value={a.id} />
            <button type="submit" className={buttonClass}>
              改回待處理
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
