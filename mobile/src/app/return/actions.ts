"use server";

import { IMAGE_TYPES, PHOTO_BUCKET, photoPath } from "@/lib/photo-steps";
import { getSupabase } from "@/lib/supabase";

// The demo has no user login, so every input is validated here and photos can
// only be written to the session's own paths through short-lived signed URLs.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type UploadTarget = { imageType: number; signedUrl: string };

export async function startReturn(rentalId: number) {
  if (!Number.isInteger(rentalId)) throw new Error("Invalid rental");
  const supabase = getSupabase();

  const { data: rental, error: rentalError } = await supabase
    .from("rentals")
    .select("id")
    .eq("id", rentalId)
    .maybeSingle();
  if (rentalError) throw new Error(rentalError.message);
  if (!rental) throw new Error("Rental not found");

  const { data: session, error } = await supabase
    .from("return_sessions")
    .insert({ rental_id: rentalId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // upsert so a retake can overwrite the photo already uploaded for that step.
  const targets: UploadTarget[] = await Promise.all(
    IMAGE_TYPES.map(async (imageType) => {
      const { data, error: urlError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUploadUrl(photoPath(session.id, imageType), { upsert: true });
      if (urlError) throw new Error(urlError.message);
      return { imageType, signedUrl: data.signedUrl };
    }),
  );
  return { sessionId: session.id as string, targets };
}

export type PhotoReport = {
  imageType: number;
  width: number;
  height: number;
  verdict: "pass" | "warn";
  rejectedShots: number;
  metrics: { sharpness: number; meanLuma: number; overexposedShare: number };
  issues: string[];
};

function finite(n: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
}

function validReport(r: PhotoReport) {
  return (
    IMAGE_TYPES.includes(r.imageType) &&
    (r.verdict === "pass" || r.verdict === "warn") &&
    finite(r.width, 1, 10000) &&
    finite(r.height, 1, 10000) &&
    Number.isInteger(r.rejectedShots) &&
    finite(r.rejectedShots, 0, 1000) &&
    finite(r.metrics?.sharpness) &&
    finite(r.metrics?.meanLuma, 0, 255) &&
    finite(r.metrics?.overexposedShare, 0, 1) &&
    Array.isArray(r.issues) &&
    r.issues.length <= 5 &&
    r.issues.every((i) => typeof i === "string" && i.length <= 30)
  );
}

export async function completeReturn(sessionId: string, reports: PhotoReport[]) {
  if (!UUID_RE.test(sessionId)) throw new Error("Invalid session");
  if (
    reports.length !== IMAGE_TYPES.length ||
    new Set(reports.map((r) => r.imageType)).size !== IMAGE_TYPES.length ||
    !reports.every(validReport)
  ) {
    throw new Error("Invalid photo report");
  }
  const supabase = getSupabase();

  const { data: session, error: sessionError } = await supabase
    .from("return_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message);
  if (!session || session.status !== "uploading") throw new Error("Session is not open");

  // Make sure every photo actually reached storage before accepting the return.
  const { data: files, error: listError } = await supabase.storage.from(PHOTO_BUCKET).list(sessionId);
  if (listError) throw new Error(listError.message);
  const uploaded = new Set((files ?? []).map((f) => f.name));
  const missing = IMAGE_TYPES.filter((t) => !uploaded.has(`${t}.jpg`));
  if (missing.length) throw new Error(`Missing photos: ${missing.join(", ")}`);

  const rows = reports.map((r) => ({
    session_id: sessionId,
    image_type: r.imageType,
    storage_path: photoPath(sessionId, r.imageType),
    width: Math.round(r.width),
    height: Math.round(r.height),
    verdict: r.verdict,
    rejected_shots: r.rejectedShots,
    quality: {
      sharpness: Math.round(r.metrics.sharpness * 10) / 10,
      mean_luma: Math.round(r.metrics.meanLuma * 10) / 10,
      overexposed_share: Math.round(r.metrics.overexposedShare * 1000) / 1000,
      issues: r.issues,
    },
  }));
  const { error: insertError } = await supabase
    .from("return_photos")
    .upsert(rows, { onConflict: "session_id,image_type" });
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("return_sessions")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", "uploading");
  if (updateError) throw new Error(updateError.message);
}
