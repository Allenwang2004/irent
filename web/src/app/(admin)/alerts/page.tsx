import Link from "next/link";
import { Suspense } from "react";
import {
  ALERT_KIND_LABELS,
  ALERT_STATUS_LABELS,
  type Alert,
  type AlertStatus,
  alertStats,
  type Case,
  DAMAGE_ALERT_KINDS,
  listCases,
  SEVERITY_LABELS,
  WORK_ORDER_KIND_LABELS,
  WORK_ORDER_STATUS_LABELS,
} from "@/lib/alerts";
import { requireSession } from "@/lib/auth";
import { DAMAGE_TYPES, KIND_LABELS, SEVERITIES } from "@/lib/inspections";
import { AutoRefresh } from "../auto-refresh";
import { buttonClass, Empty, formatTime, PageHeader, PhotoTile, primaryButtonClass, selectClass, Tabs } from "../ui";
import { dismissCase, handleAlert, reopenAlert } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTERS: (AlertStatus | "all")[] = ["open", "confirmed", "dismissed", "all"];

export default function AlertsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={15} />
      <PageHeader
        title="預警"
        subtitle="VLM worker 比對取車、還車照片後回報的狀況，一次取還車一張卡片，最嚴重、等最久的排最前面。頁面每 15 秒自動更新。"
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
  const [cases, stats] = await Promise.all([listCases(status), alertStats(7)]);

  return (
    <>
      <StatsPanel stats={stats} />
      <Tabs
        current={status}
        items={FILTERS.map((f) => ({
          key: f,
          href: f === "open" ? "/alerts" : `/alerts?status=${f}`,
          label: f === "all" ? "全部" : ALERT_STATUS_LABELS[f],
        }))}
      />
      {cases.length === 0 ? (
        <Empty>{status === "open" ? "沒有待處理的預警" : "沒有預警"}</Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {cases.map((c) => (
            <CaseCard key={c.inspection.id} item={c} />
          ))}
        </ul>
      )}
    </>
  );
}

function percent(v: number | null) {
  return v === null ? "-" : `${Math.round(v * 100)}%`;
}

function minutes(v: number | null) {
  if (v === null) return "-";
  return v < 60 ? `${Math.round(v)} 分鐘` : `${(v / 60).toFixed(1)} 小時`;
}

// Staff decisions double as labels: the confirm rate is the model's live precision.
function StatsPanel({ stats }: { stats: Awaited<ReturnType<typeof alertStats>> }) {
  const reviewed = stats.reduce((n, s) => n + s.confirmed + s.dismissed, 0);
  const confirmed = stats.reduce((n, s) => n + s.confirmed, 0);
  return (
    <details className="rounded-lg border border-line bg-surface-1 p-4 text-sm">
      <summary className="cursor-pointer font-medium">
        近 7 天統計：{stats.reduce((n, s) => n + s.total, 0)} 筆預警，人工確認率 {percent(reviewed ? confirmed / reviewed : null)}
      </summary>
      <p className="mt-2 text-ink-2">
        確認率 = 確認 ÷（確認＋駁回），代表 AI 預警在實際使用中的準確度；駁回多的種類，代表該調整門檻或提示詞。
      </p>
      {stats.length === 0 ? (
        <p className="mt-2 text-ink-3">還沒有資料</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full tabular-nums">
            <thead className="text-left text-ink-3">
              <tr className="border-b border-line">
                <th className="py-1.5 pr-4 font-normal">種類</th>
                <th className="py-1.5 pr-4 font-normal">總數</th>
                <th className="py-1.5 pr-4 font-normal">待處理</th>
                <th className="py-1.5 pr-4 font-normal">確認</th>
                <th className="py-1.5 pr-4 font-normal">駁回</th>
                <th className="py-1.5 pr-4 font-normal">確認率</th>
                <th className="py-1.5 font-normal">處理時間中位數</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.kind} className="border-b border-line last:border-0">
                  <td className="py-1.5 pr-4">{ALERT_KIND_LABELS[s.kind]}</td>
                  <td className="py-1.5 pr-4">{s.total}</td>
                  <td className="py-1.5 pr-4">{s.open}</td>
                  <td className="py-1.5 pr-4">{s.confirmed}</td>
                  <td className="py-1.5 pr-4">{s.dismissed}</td>
                  <td className="py-1.5 pr-4">{percent(s.confirmRate)}</td>
                  <td className="py-1.5">{minutes(s.medianHandleMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}

function CaseCard({ item: c }: { item: Case }) {
  const urgent = c.openCount > 0 && c.severity === "high";
  return (
    <li className={`rounded-lg border bg-surface-1 p-4 ${urgent ? "border-accent" : "border-line"}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {c.vehicle && (
          <Link href={`/vehicles/${c.vehicle.id}`} className="text-lg font-semibold hover:underline">
            {c.vehicle.plate}
          </Link>
        )}
        <span className="rounded-full border border-line px-2 py-0.5 text-xs">{KIND_LABELS[c.inspection.kind]}</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-xs">最高嚴重度 {SEVERITY_LABELS[c.severity]}</span>
        <span className="text-sm text-ink-2">{formatTime(c.inspection.submitted_at)} 送出</span>
        <span className="ml-auto text-sm text-ink-3">
          {c.openCount > 0 ? `${c.openCount} 項待處理` : "已處理"}
        </span>
      </div>

      {c.workOrders.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {c.workOrders.map((o) => (
            <li key={o.id} className="rounded border border-line px-2 py-1">
              工單：{WORK_ORDER_KIND_LABELS[o.kind]}・{WORK_ORDER_STATUS_LABELS[o.status]}
              {o.blocks_rental && o.status === "open" ? "・車輛暫停出租" : ""}
            </li>
          ))}
          <li>
            <Link href="/work-orders" className="text-accent hover:underline">
              前往工單
            </Link>
          </li>
        </ul>
      )}

      <ul className="mt-3 flex flex-col divide-y divide-line">
        {c.alerts.map((a) => (
          <AlertItem key={a.id} alert={a} />
        ))}
      </ul>

      {c.openCount > 1 && (
        <form action={dismissCase} className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3 text-sm">
          <input type="hidden" name="inspection_id" value={c.inspection.id} />
          <input name="note" maxLength={500} placeholder="整筆駁回的原因（選填）" className={`${selectClass} min-w-48 flex-1`} />
          <button type="submit" className={buttonClass}>
            整筆駁回（全部是誤報）
          </button>
        </form>
      )}
    </li>
  );
}

function AlertItem({ alert: a }: { alert: Alert }) {
  const isDamage = DAMAGE_ALERT_KINDS.includes(a.kind);
  const firstItem = a.details.items?.[0];
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium">{ALERT_KIND_LABELS[a.kind] ?? a.kind}</span>
        <span className="text-xs text-ink-3">嚴重度 {SEVERITY_LABELS[a.severity]}</span>
        <span className="ml-auto text-xs text-ink-3">{ALERT_STATUS_LABELS[a.status]}</span>
      </div>
      <p className="mt-1 text-sm">{a.message}</p>

      {(a.photo || a.baseline) && (
        <div className="mt-2 grid max-w-sm grid-cols-2 gap-3">
          {a.baseline && <PhotoTile url={a.baseline.url} label="比對基準（上一次）" />}
          {a.photo && <PhotoTile url={a.photo.url} label={`這次：${a.photo.label}`} />}
        </div>
      )}

      {a.status === "open" ? (
        <form action={handleAlert} className="mt-3 flex flex-col gap-2 text-sm">
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
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-2">
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
