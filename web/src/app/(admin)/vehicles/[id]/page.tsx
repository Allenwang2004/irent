import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import {
  ANGLE_LABELS,
  ANGLE_ORDER,
  DAMAGE_TYPES,
  KIND_LABELS,
  listInspections,
  photoLabel,
  SEVERITIES,
} from "@/lib/inspections";
import { getVehicle, listDamages, openRentalFor, registrationLink, VEHICLE_STATUS_LABELS } from "@/lib/vehicles";
import { buttonClass, Empty, formatTime, PhotoTile, primaryButtonClass, selectClass } from "../../ui";
import { addDamage, releaseVehicle, setDamageStatus, setRetired } from "../actions";
import { CopyButton } from "./copy-button";

type Params = Promise<{ id: string }>;

export default function VehiclePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-3">載入中...</p>}>
      <VehicleContent params={params} />
    </Suspense>
  );
}

async function VehicleContent({ params }: { params: Params }) {
  await requireSession();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const vehicle = await getVehicle(id);
  if (!vehicle) notFound();
  const [damages, rental, inspections] = await Promise.all([
    listDamages(id),
    openRentalFor(id),
    listInspections({ vehicleId: id, limit: 20 }),
  ]);
  const registration = inspections.find((i) => i.kind === "registration");
  const history = inspections.filter((i) => i.kind !== "registration");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/vehicles" className="text-sm text-ink-2 hover:text-ink">
          車輛
        </Link>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-2xl font-semibold">{vehicle.plate}</h1>
          <span className="text-ink-2">{vehicle.car_model}</span>
          <span className="rounded-full border border-line px-2 py-0.5 text-sm">{VEHICLE_STATUS_LABELS[vehicle.status]}</span>
        </div>
        {rental && (
          <p className="mt-1 text-sm text-ink-2">
            目前訂單 {rental.order_no}（{rental.status === "picking_up" ? "取車中" : "租用中"}，{formatTime(rental.started_at)} 開始）
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {vehicle.status === "in_use" && (
            <form action={releaseVehicle}>
              <input type="hidden" name="id" value={vehicle.id} />
              <button type="submit" className={buttonClass} title="取車或還車中途放棄、車輛卡在使用中時使用">
                強制結束目前訂單並設為可借用
              </button>
            </form>
          )}
          {(vehicle.status === "available" || vehicle.status === "retired") && (
            <form action={setRetired}>
              <input type="hidden" name="id" value={vehicle.id} />
              <input type="hidden" name="retire" value={vehicle.status === "available" ? "1" : "0"} />
              <button type="submit" className={buttonClass}>
                {vehicle.status === "available" ? "停用（不出現在取車清單）" : "恢復可借用"}
              </button>
            </form>
          )}
        </div>
      </div>

      <section className="rounded-lg border border-line bg-surface-1 p-4">
        <h2 className="font-semibold">基準照片（登錄）</h2>
        {vehicle.status === "registering" ? (
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <p className="text-ink-2">
              用手機開啟下面的連結，拍攝卡片與 6 個角度的基準照片。完成後這台車才會出現在取車清單。連結只給營運人員使用，請勿外流。
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded bg-surface-2 px-2 py-1 text-xs">{registrationLink(vehicle)}</code>
              <CopyButton text={registrationLink(vehicle)} />
            </div>
          </div>
        ) : registration ? (
          <>
            <p className="mt-1 text-sm text-ink-2">{formatTime(registration.submitted_at)} 登錄</p>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {registration.photos.map((p) => (
                <PhotoTile key={p.id} url={p.url} label={photoLabel(p)} />
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-3">找不到登錄照片</p>
        )}
      </section>

      <section className="rounded-lg border border-line bg-surface-1 p-4">
        <h2 className="font-semibold">已知車損</h2>
        <p className="mt-1 text-sm text-ink-2">
          取車與還車時會提示用戶拍下這些損傷。登錄時看到的舊傷在這裡新增；預警頁確認的新車損也會自動加入。
        </p>
        {damages.length === 0 ? (
          <p className="mt-3 text-sm text-ink-3">沒有記錄的車損</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {damages.map((d) => (
              <li key={d.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm ${d.status === "repaired" ? "text-ink-3" : ""}`}>
                <span className="font-medium">{d.location}</span>
                <span>
                  {d.damage_type}・{d.severity}
                </span>
                {d.image_type && <span className="text-ink-3">從{ANGLE_LABELS[d.image_type]}看得到</span>}
                {d.note && <span className="text-ink-3">{d.note}</span>}
                <span className="text-ink-3">{d.source === "alert" ? "來自預警" : "登錄時記錄"}</span>
                {d.status === "repaired" && <span>已修復</span>}
                <form action={setDamageStatus} className="ml-auto">
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="status" value={d.status === "active" ? "repaired" : "active"} />
                  <button type="submit" className={buttonClass}>
                    {d.status === "active" ? "標為已修復" : "恢復"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addDamage} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <input type="hidden" name="vehicle_id" value={vehicle.id} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-2">位置</span>
            <input name="location" required maxLength={40} placeholder="左前保險桿" className={`${selectClass} w-40`} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-2">類型</span>
            <select name="damage_type" className={selectClass}>
              {DAMAGE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-2">嚴重度</span>
            <select name="severity" className={selectClass}>
              {SEVERITIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-2">從哪個角度看得到</span>
            <select name="image_type" className={selectClass} defaultValue="">
              <option value="">不指定</option>
              {ANGLE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {ANGLE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-ink-2">備註</span>
            <input name="note" maxLength={200} className={`${selectClass} min-w-40`} />
          </label>
          <button type="submit" className={primaryButtonClass}>
            新增車損
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">取還車紀錄</h2>
        {history.length === 0 ? (
          <Empty>還沒有取車或還車紀錄</Empty>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {history.map((i) => (
              <li key={i.id} className="flex flex-wrap gap-x-4 rounded-lg border border-line bg-surface-1 px-4 py-2">
                <span className="font-medium">{KIND_LABELS[i.kind]}</span>
                <span className="text-ink-2">{formatTime(i.submitted_at)}</span>
                <span className="text-ink-3">訂單 {i.rental?.order_no}</span>
                <span className="text-ink-3">{i.photos.length} 張照片</span>
                <Link href={`/inspections?vehicle=${vehicle.id}`} className="ml-auto text-accent hover:underline">
                  看照片
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
