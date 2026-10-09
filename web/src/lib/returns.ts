import "server-only";
import { getSupabase } from "./supabase";

// Labels for iRent's image_type codes, in the order the mobile flow asks for
// them. mobile/src/lib/photo-steps.ts defines the same steps; change both together.
export const IMAGE_TYPE_LABELS: [number, string][] = [
  [10, "前座"],
  [11, "後座"],
  [1, "左前"],
  [2, "右前"],
  [3, "左後"],
  [4, "右後"],
];

const PHOTO_BUCKET = "return-photos";
const SIGNED_URL_SECONDS = 60 * 60;

export type ReturnPhoto = {
  image_type: number;
  storage_path: string;
  verdict: "pass" | "warn";
  rejected_shots: number;
  quality: { sharpness?: number; mean_luma?: number; overexposed_share?: number; issues?: string[] };
  url: string | null;
};

export type ReturnSession = {
  id: string;
  submitted_at: string;
  rental: { order_no: string; plate: string; car_model: string } | null;
  photos: ReturnPhoto[];
};

type Row = Omit<ReturnSession, "rental" | "photos"> & {
  rentals: ReturnSession["rental"];
  return_photos: Omit<ReturnPhoto, "url">[];
};

export async function listReturns(limit = 30): Promise<ReturnSession[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("return_sessions")
    .select(
      "id, submitted_at, rentals(order_no, plate, car_model), return_photos(image_type, storage_path, verdict, rejected_shots, quality)",
    )
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  // The bucket is private, so the back office gets short-lived links.
  const paths = rows.flatMap((r) => r.return_photos.map((p) => p.storage_path));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed, error: signError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (signError) throw new Error(signError.message);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  const order = new Map(IMAGE_TYPE_LABELS.map(([type], i) => [type, i]));
  return rows.map((r) => ({
    id: r.id,
    submitted_at: r.submitted_at,
    rental: r.rentals,
    photos: r.return_photos
      .map((p) => ({ ...p, url: urls.get(p.storage_path) ?? null }))
      .sort((a, b) => (order.get(a.image_type) ?? 99) - (order.get(b.image_type) ?? 99)),
  }));
}
