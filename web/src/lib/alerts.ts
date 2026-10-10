import "server-only";
import { photoLabel, signPhotoUrls } from "./inspections";
import { getSupabase } from "./supabase";

export const ALERT_KIND_LABELS: Record<string, string> = {
  new_damage: "還車新車損",
  pickup_difference: "取車時車況不符",
  reported_damage: "用戶回報損傷",
  dirty: "車內髒汙",
  left_item: "遺留物",
  card_missing: "卡片缺少",
  needs_review: "需人工確認",
};

// Alerts about damage can become a known-damage record when confirmed.
export const DAMAGE_ALERT_KINDS = ["new_damage", "pickup_difference", "reported_damage"];

export const SEVERITY_LABELS = { high: "高", medium: "中", low: "低" } as const;
export const ALERT_STATUS_LABELS = { open: "待處理", confirmed: "已確認", dismissed: "已駁回" } as const;
export type AlertStatus = keyof typeof ALERT_STATUS_LABELS;

export type DamageItem = { location: string; type: string; severity: string };

export type Alert = {
  id: number;
  kind: string;
  severity: keyof typeof SEVERITY_LABELS;
  message: string;
  details: { items?: DamageItem[]; image_type?: number; [k: string]: unknown };
  status: AlertStatus;
  note: string | null;
  created_at: string;
  handled_at: string | null;
  inspection: { id: string; kind: "pickup" | "return"; submitted_at: string } | null;
  vehicle: { id: number; plate: string; car_model: string } | null;
  photo: { label: string; url: string | null; image_type: number | null } | null;
  // The earlier photo the worker compared against, when there is one.
  baseline: { url: string | null } | null;
};

type Row = Omit<Alert, "inspection" | "vehicle" | "photo" | "baseline"> & {
  inspections: Alert["inspection"];
  vehicles: Alert["vehicle"];
  inspection_photos: {
    id: number;
    category: "card" | "angle" | "known_damage" | "extra";
    image_type: number | null;
    location: string | null;
    storage_path: string;
    photo_analyses: { kind: string; baseline: { storage_path: string } | null }[];
  } | null;
};

export async function listAlerts(status: AlertStatus | "all", limit = 300): Promise<Alert[]> {
  let query = getSupabase()
    .from("alerts")
    .select(
      "id, kind, severity, message, details, status, note, created_at, handled_at, " +
        "inspections(id, kind, submitted_at), vehicles(id, plate, car_model), " +
        "inspection_photos(id, category, image_type, location, storage_path, " +
        "photo_analyses!photo_analyses_photo_id_fkey(kind, baseline:inspection_photos!photo_analyses_baseline_photo_id_fkey(storage_path)))",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  const baselinePath = (r: Row) =>
    r.inspection_photos?.photo_analyses.find((a) => a.kind === "compare")?.baseline?.storage_path ?? null;
  const urls = await signPhotoUrls(
    rows.flatMap((r) => [r.inspection_photos?.storage_path ?? "", baselinePath(r) ?? ""]),
  );

  return rows.map(({ inspections, vehicles, inspection_photos: p, ...a }) => {
    const base = baselinePath({ inspection_photos: p } as Row);
    return {
      ...a,
      inspection: inspections,
      vehicle: vehicles,
      photo: p ? { label: photoLabel(p), url: urls.get(p.storage_path) ?? null, image_type: p.image_type } : null,
      baseline: base ? { url: urls.get(base) ?? null } : null,
    };
  });
}

export async function countOpenAlerts() {
  const { count, error } = await getSupabase().from("alerts").select("id", { count: "exact", head: true }).eq("status", "open");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ---------------------------------------------------------------- cases

// One pickup or return with everything the worker found in it, handled together.
export type Case = {
  inspection: NonNullable<Alert["inspection"]>;
  vehicle: Alert["vehicle"];
  alerts: Alert[];
  severity: Alert["severity"];
  openCount: number;
  createdAt: string;
  workOrders: WorkOrder[];
};

const SEVERITY_RANK = { high: 3, medium: 2, low: 1 } as const;

export async function listCases(status: AlertStatus | "all"): Promise<Case[]> {
  const alerts = await listAlerts(status, 300);
  const byInspection = new Map<string, Alert[]>();
  for (const a of alerts) {
    if (!a.inspection) continue;
    byInspection.set(a.inspection.id, [...(byInspection.get(a.inspection.id) ?? []), a]);
  }
  const orders = await listWorkOrders({ inspectionIds: [...byInspection.keys()] });
  const cases = [...byInspection.values()].map<Case>((list) => {
    const open = list.filter((a) => a.status === "open");
    const ranked = open.length ? open : list;
    return {
      inspection: list[0].inspection!,
      vehicle: list[0].vehicle,
      // Most severe first inside a case too.
      alerts: [...list].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]),
      severity: ranked.reduce((s, a) => (SEVERITY_RANK[a.severity] > SEVERITY_RANK[s] ? a.severity : s), "low" as Alert["severity"]),
      openCount: open.length,
      createdAt: list.reduce((t, a) => (a.created_at < t ? a.created_at : t), list[0].created_at),
      workOrders: orders.filter((o) => o.inspection_id === list[0].inspection!.id),
    };
  });
  // Open work: most severe first, then the one waiting longest. History: newest first.
  return status === "open"
    ? cases.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.createdAt.localeCompare(b.createdAt))
    : cases.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function countOpenCases() {
  const { data, error } = await getSupabase().from("alerts").select("inspection_id").eq("status", "open");
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.inspection_id)).size;
}

// ---------------------------------------------------------------- work orders

export const WORK_ORDER_KIND_LABELS = {
  cleaning: "清潔",
  repair: "檢修",
  contact_renter: "聯絡用戶",
} as const;
export const WORK_ORDER_STATUS_LABELS = { open: "進行中", done: "已完成", cancelled: "已取消" } as const;

export type WorkOrder = {
  id: number;
  vehicle_id: number;
  inspection_id: string | null;
  alert_id: number | null;
  kind: keyof typeof WORK_ORDER_KIND_LABELS;
  blocks_rental: boolean;
  status: keyof typeof WORK_ORDER_STATUS_LABELS;
  note: string | null;
  created_at: string;
  closed_at: string | null;
  vehicle?: { id: number; plate: string; car_model: string; status: string } | null;
  alert?: { kind: string; message: string } | null;
};

export async function listWorkOrders(opts: { status?: WorkOrder["status"]; inspectionIds?: string[]; limit?: number }) {
  if (opts.inspectionIds && opts.inspectionIds.length === 0) return [];
  let query = getSupabase()
    .from("work_orders")
    .select("*, vehicles(id, plate, car_model, status), alerts(kind, message)")
    .order("created_at", { ascending: opts.status === "open" })
    .limit(opts.limit ?? 200);
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.inspectionIds) query = query.in("inspection_id", opts.inspectionIds);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as (WorkOrder & { vehicles: WorkOrder["vehicle"]; alerts: WorkOrder["alert"] })[]).map(
    ({ vehicles, alerts, ...o }) => ({ ...o, vehicle: vehicles, alert: alerts }),
  );
}

export async function countOpenWorkOrders() {
  const { count, error } = await getSupabase()
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ---------------------------------------------------------------- stats

// How the model's alerts fare once staff look at them: the confirm rate is the
// share of reviewed alerts that were real, i.e. the live precision.
export type KindStats = {
  kind: string;
  total: number;
  open: number;
  confirmed: number;
  dismissed: number;
  confirmRate: number | null;
  medianHandleMinutes: number | null;
};

export async function alertStats(days = 7): Promise<KindStats[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getSupabase()
    .from("alerts")
    .select("kind, status, created_at, handled_at")
    .gte("created_at", since)
    .limit(10000);
  if (error) throw new Error(error.message);
  const byKind = new Map<string, { status: string; created_at: string; handled_at: string | null }[]>();
  for (const r of data ?? []) byKind.set(r.kind, [...(byKind.get(r.kind) ?? []), r]);

  return Object.keys(ALERT_KIND_LABELS)
    .filter((k) => byKind.has(k))
    .map((kind) => {
      const rows = byKind.get(kind)!;
      const confirmed = rows.filter((r) => r.status === "confirmed").length;
      const dismissed = rows.filter((r) => r.status === "dismissed").length;
      const minutes = rows
        .filter((r) => r.handled_at)
        .map((r) => (new Date(r.handled_at!).getTime() - new Date(r.created_at).getTime()) / 60000)
        .sort((a, b) => a - b);
      return {
        kind,
        total: rows.length,
        open: rows.filter((r) => r.status === "open").length,
        confirmed,
        dismissed,
        confirmRate: confirmed + dismissed ? confirmed / (confirmed + dismissed) : null,
        medianHandleMinutes: minutes.length ? minutes[Math.floor(minutes.length / 2)] : null,
      };
    });
}
