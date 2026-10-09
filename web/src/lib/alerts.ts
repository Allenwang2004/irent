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

export async function listAlerts(status: AlertStatus | "all", limit = 50): Promise<Alert[]> {
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
