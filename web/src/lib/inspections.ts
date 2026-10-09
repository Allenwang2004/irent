import "server-only";
import { getSupabase } from "./supabase";

// Labels shared with mobile/src/lib/inspection.ts and the worker; change together.
export const ANGLE_LABELS: Record<number, string> = {
  1: "左前",
  2: "右前",
  3: "左後",
  4: "右後",
  10: "前座",
  11: "後座",
};
export const ANGLE_ORDER = [10, 11, 1, 2, 3, 4];
export const DAMAGE_TYPES = ["刮傷", "凹陷", "破裂", "掉漆", "燈具破損", "其他"] as const;
export const SEVERITIES = ["輕微", "中等", "嚴重"] as const;

export const KIND_LABELS = { registration: "登錄", pickup: "取車", return: "還車" } as const;
export type InspectionKind = keyof typeof KIND_LABELS;

export const VERDICT_LABELS: Record<string, string> = {
  no_new_damage: "無新車損",
  new_damage: "疑似新車損",
  not_comparable: "無法比對",
  no_baseline: "無基準照",
  clean: "乾淨",
  normal: "普通",
  dirty: "髒汙",
  cards_present: "卡片齊全",
  card_missing: "缺少卡片",
  damage_visible: "看得到損傷",
  no_damage_visible: "看不到損傷",
  error: "判讀失敗",
};

const PHOTO_BUCKET = "inspection-photos";
const SIGNED_URL_SECONDS = 60 * 60;

// The bucket is private, so the back office gets short-lived links.
export async function signPhotoUrls(paths: string[]) {
  const urls = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return urls;
  const { data, error } = await getSupabase().storage.from(PHOTO_BUCKET).createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) throw new Error(error.message);
  for (const s of data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  return urls;
}

export type Photo = {
  id: number;
  slot: string;
  category: "card" | "angle" | "known_damage" | "extra";
  image_type: number | null;
  damage_id: number | null;
  location: string | null;
  note: string | null;
  storage_path: string;
  verdict: "pass" | "warn";
  rejected_shots: number;
  url: string | null;
  analyses: { kind: string; verdict: string; confidence: number | null; results: unknown[] }[];
};

export type Inspection = {
  id: string;
  kind: InspectionKind;
  submitted_at: string;
  analysis_status: string;
  analysis_error: string | null;
  vehicle: { id: number; plate: string; car_model: string } | null;
  rental: { order_no: string } | null;
  photos: Photo[];
};

export function photoLabel(p: Pick<Photo, "category" | "image_type" | "location">, damageLocation?: string) {
  if (p.category === "card") return "卡片";
  if (p.category === "angle") return ANGLE_LABELS[p.image_type ?? 0] ?? "角度";
  if (p.category === "known_damage") return `已知：${damageLocation ?? "車損"}`;
  return `回報：${p.location ?? "損傷"}`;
}

const CATEGORY_ORDER = { card: 0, angle: 1, known_damage: 2, extra: 3 };

function sortPhotos(photos: Photo[]) {
  return photos.sort(
    (a, b) =>
      CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] ||
      ANGLE_ORDER.indexOf(a.image_type ?? 0) - ANGLE_ORDER.indexOf(b.image_type ?? 0) ||
      a.slot.localeCompare(b.slot),
  );
}

type Row = Omit<Inspection, "vehicle" | "rental" | "photos"> & {
  vehicles: Inspection["vehicle"];
  rentals: Inspection["rental"];
  inspection_photos: (Omit<Photo, "url" | "analyses"> & { photo_analyses: Photo["analyses"] })[];
};

export async function listInspections(opts: { kind?: InspectionKind; vehicleId?: number; limit?: number }) {
  let query = getSupabase()
    .from("inspections")
    .select(
      "id, kind, submitted_at, analysis_status, analysis_error, vehicles(id, plate, car_model), rentals(order_no), " +
        "inspection_photos(id, slot, category, image_type, damage_id, location, note, storage_path, verdict, rejected_shots, " +
        "photo_analyses!photo_analyses_photo_id_fkey(kind, verdict, confidence, results))",
    )
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(opts.limit ?? 30);
  if (opts.kind) query = query.eq("kind", opts.kind);
  if (opts.vehicleId) query = query.eq("vehicle_id", opts.vehicleId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  const urls = await signPhotoUrls(rows.flatMap((r) => r.inspection_photos.map((p) => p.storage_path)));
  return rows.map<Inspection>((r) => ({
    id: r.id,
    kind: r.kind,
    submitted_at: r.submitted_at,
    analysis_status: r.analysis_status,
    analysis_error: r.analysis_error,
    vehicle: r.vehicles,
    rental: r.rentals,
    photos: sortPhotos(
      r.inspection_photos.map(({ photo_analyses, ...p }) => ({
        ...p,
        analyses: photo_analyses ?? [],
        url: urls.get(p.storage_path) ?? null,
      })),
    ),
  }));
}
