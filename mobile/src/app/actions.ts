"use server";

import { randomBytes } from "node:crypto";
import {
  type InspectionKind,
  knownDamageSlot,
  extraSlot,
  MAX_EXTRA_PHOTOS,
  PHOTO_BUCKET,
  REQUIRED_SLOTS,
  REQUIRED_STEPS,
  DAMAGE_AREAS,
  storagePath,
} from "@/lib/inspection";
import { getSupabase } from "@/lib/supabase";

// The demo has no user login, so every input is validated here, state changes
// are guarded by the current status, and photos can only be written to the
// inspection's own paths through short-lived signed URLs.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type UploadTarget = { slot: string; signedUrl: string };
export type Started = { inspectionId: string; targets: UploadTarget[] };

async function signedUploads(kind: InspectionKind, inspectionId: string, slots: string[]) {
  const supabase = getSupabase();
  return Promise.all(
    slots.map(async (slot) => {
      // upsert so a retake can overwrite the photo already uploaded for that slot.
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUploadUrl(storagePath(kind, inspectionId, slot), { upsert: true });
      if (error) throw new Error(error.message);
      return { slot, signedUrl: data.signedUrl };
    }),
  );
}

async function activeDamageSlots(vehicleId: number) {
  const { data, error } = await getSupabase()
    .from("vehicle_damages")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => knownDamageSlot(d.id));
}

function orderNo() {
  const d = new Date();
  const ymd = `${d.getFullYear() % 100}`.padStart(2, "0") + `${d.getMonth() + 1}`.padStart(2, "0") + `${d.getDate()}`.padStart(2, "0");
  return `R${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function startPickup(vehicleId: number): Promise<Started & { rentalId: number }> {
  if (!Number.isInteger(vehicleId)) throw new Error("Invalid vehicle");
  const supabase = getSupabase();

  // Reserve the car first; only an available car can be taken.
  const { data: reserved, error: reserveError } = await supabase
    .from("vehicles")
    .update({ status: "in_use", updated_at: new Date().toISOString() })
    .eq("id", vehicleId)
    .eq("status", "available")
    .select("id");
  if (reserveError) throw new Error(reserveError.message);
  if (!reserved?.length) throw new Error("Vehicle is not available");

  try {
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .insert({ vehicle_id: vehicleId, order_no: orderNo() })
      .select("id")
      .single();
    if (rentalError) throw new Error(rentalError.message);

    const { data: inspection, error } = await supabase
      .from("inspections")
      .insert({ vehicle_id: vehicleId, rental_id: rental.id, kind: "pickup" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const slots = [...REQUIRED_SLOTS, ...(await activeDamageSlots(vehicleId))];
    return { inspectionId: inspection.id, rentalId: rental.id, targets: await signedUploads("pickup", inspection.id, slots) };
  } catch (err) {
    await supabase.from("rentals").update({ status: "cancelled" }).eq("vehicle_id", vehicleId).eq("status", "picking_up");
    await supabase.from("vehicles").update({ status: "available" }).eq("id", vehicleId).eq("status", "in_use");
    throw err;
  }
}

export async function startReturn(rentalId: number): Promise<Started> {
  if (!Number.isInteger(rentalId)) throw new Error("Invalid rental");
  const supabase = getSupabase();
  const { data: rental, error: rentalError } = await supabase
    .from("rentals")
    .select("id, vehicle_id, status")
    .eq("id", rentalId)
    .maybeSingle();
  if (rentalError) throw new Error(rentalError.message);
  if (!rental || rental.status !== "in_use") throw new Error("Rental is not in use");

  const { data: inspection, error } = await supabase
    .from("inspections")
    .insert({ vehicle_id: rental.vehicle_id, rental_id: rental.id, kind: "return" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const slots = [...REQUIRED_SLOTS, ...(await activeDamageSlots(rental.vehicle_id))];
  return { inspectionId: inspection.id, targets: await signedUploads("return", inspection.id, slots) };
}

export async function startRegistration(vehicleId: number, token: string): Promise<Started> {
  if (!Number.isInteger(vehicleId) || !UUID_RE.test(token)) throw new Error("Invalid registration link");
  const supabase = getSupabase();
  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, status, registration_token")
    .eq("id", vehicleId)
    .maybeSingle();
  if (vehicleError) throw new Error(vehicleError.message);
  if (!vehicle || vehicle.registration_token !== token || vehicle.status !== "registering") {
    throw new Error("Invalid registration link");
  }

  const { data: inspection, error } = await supabase
    .from("inspections")
    .insert({ vehicle_id: vehicleId, kind: "registration" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { inspectionId: inspection.id, targets: await signedUploads("registration", inspection.id, REQUIRED_SLOTS) };
}

async function openInspection(inspectionId: string) {
  if (!UUID_RE.test(inspectionId)) throw new Error("Invalid inspection");
  const { data, error } = await getSupabase()
    .from("inspections")
    .select("id, kind, status, vehicle_id, rental_id")
    .eq("id", inspectionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.status !== "uploading") throw new Error("Inspection is not open");
  return data as { id: string; kind: InspectionKind; status: string; vehicle_id: number; rental_id: number | null };
}

export async function extraUploadUrl(inspectionId: string, index: number): Promise<UploadTarget> {
  if (!Number.isInteger(index) || index < 0 || index >= MAX_EXTRA_PHOTOS) throw new Error("Invalid photo");
  const inspection = await openInspection(inspectionId);
  if (inspection.kind === "registration") throw new Error("Not allowed");
  const [target] = await signedUploads(inspection.kind, inspection.id, [extraSlot(index)]);
  return target;
}

// Abandoning a pickup releases the car again.
export async function cancelInspection(inspectionId: string) {
  const inspection = await openInspection(inspectionId);
  const supabase = getSupabase();
  await removeFolder(inspection.kind, inspection.id);
  await supabase.from("inspections").delete().eq("id", inspection.id);
  if (inspection.kind === "pickup" && inspection.rental_id) {
    await supabase.from("rentals").update({ status: "cancelled" }).eq("id", inspection.rental_id).eq("status", "picking_up");
    await supabase.from("vehicles").update({ status: "available" }).eq("id", inspection.vehicle_id).eq("status", "in_use");
  }
}

// For a pickup that was left half done (page closed): cancel it from the car list.
export async function cancelPickupRental(rentalId: number) {
  if (!Number.isInteger(rentalId)) throw new Error("Invalid rental");
  const supabase = getSupabase();
  const { data: rental } = await supabase
    .from("rentals")
    .select("id, vehicle_id, status")
    .eq("id", rentalId)
    .maybeSingle();
  if (!rental || rental.status !== "picking_up") throw new Error("Rental is not being picked up");
  const { data: open } = await supabase
    .from("inspections")
    .select("id")
    .eq("rental_id", rentalId)
    .eq("kind", "pickup")
    .eq("status", "uploading");
  for (const i of open ?? []) {
    await removeFolder("pickup", i.id);
    await supabase.from("inspections").delete().eq("id", i.id);
  }
  await supabase.from("rentals").update({ status: "cancelled" }).eq("id", rentalId).eq("status", "picking_up");
  await supabase.from("vehicles").update({ status: "available" }).eq("id", rental.vehicle_id).eq("status", "in_use");
}

async function removeFolder(kind: InspectionKind, inspectionId: string) {
  const bucket = getSupabase().storage.from(PHOTO_BUCKET);
  const { data } = await bucket.list(`${kind}/${inspectionId}`);
  if (data?.length) await bucket.remove(data.map((f) => `${kind}/${inspectionId}/${f.name}`));
}

export type PhotoReport = {
  slot: string;
  width: number;
  height: number;
  verdict: "pass" | "warn";
  rejectedShots: number;
  metrics: { sharpness: number; meanLuma: number; overexposedShare: number };
  issues: string[];
  // extra photos only
  location?: string;
  note?: string;
};

function finite(n: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
}

function validReport(r: PhotoReport) {
  return (
    typeof r.slot === "string" &&
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
    r.issues.every((i) => typeof i === "string" && i.length <= 30) &&
    (r.location === undefined || (typeof r.location === "string" && r.location.length <= 20)) &&
    (r.note === undefined || (typeof r.note === "string" && r.note.length <= 200))
  );
}

export async function completeInspection(inspectionId: string, reports: PhotoReport[]) {
  const inspection = await openInspection(inspectionId);
  const supabase = getSupabase();

  // The rental must still be in the state this inspection belongs to.
  if (inspection.rental_id) {
    const { data: rental } = await supabase.from("rentals").select("status").eq("id", inspection.rental_id).maybeSingle();
    const expected = inspection.kind === "pickup" ? "picking_up" : "in_use";
    if (rental?.status !== expected) throw new Error("Rental is no longer open");
  }

  if (!Array.isArray(reports) || reports.length > 50 || !reports.every(validReport)) {
    throw new Error("Invalid photo report");
  }
  const slots = new Set(reports.map((r) => r.slot));
  if (slots.size !== reports.length) throw new Error("Duplicate photo");
  if (!REQUIRED_SLOTS.every((s) => slots.has(s))) throw new Error("Missing required photos");

  const damageSlots = new Map(
    inspection.kind === "registration"
      ? []
      : (await activeDamageSlots(inspection.vehicle_id)).map((slot) => [slot, Number(slot.slice("known-".length))]),
  );
  const extraSlots = new Set(Array.from({ length: MAX_EXTRA_PHOTOS }, (_, i) => extraSlot(i)));
  for (const r of reports) {
    const ok =
      REQUIRED_SLOTS.includes(r.slot) ||
      damageSlots.has(r.slot) ||
      (inspection.kind !== "registration" && extraSlots.has(r.slot) &&
        (DAMAGE_AREAS as readonly string[]).includes(r.location ?? ""));
    if (!ok) throw new Error(`Unexpected photo ${r.slot}`);
  }

  // Make sure every reported photo actually reached storage.
  const folder = `${inspection.kind}/${inspection.id}`;
  const { data: files, error: listError } = await supabase.storage.from(PHOTO_BUCKET).list(folder);
  if (listError) throw new Error(listError.message);
  const uploaded = new Set((files ?? []).map((f) => f.name.replace(/\.jpg$/, "")));
  const missing = [...slots].filter((s) => !uploaded.has(s));
  if (missing.length) throw new Error(`Missing uploads: ${missing.join(", ")}`);

  const stepBySlot = new Map(REQUIRED_STEPS.map((s) => [s.slot, s]));
  const rows = reports.map((r) => {
    const step = stepBySlot.get(r.slot);
    const category = step ? step.category : damageSlots.has(r.slot) ? "known_damage" : "extra";
    return {
      inspection_id: inspection.id,
      slot: r.slot,
      category,
      image_type: step?.imageType ?? null,
      damage_id: damageSlots.get(r.slot) ?? null,
      location: category === "extra" ? r.location : null,
      note: category === "extra" ? r.note?.trim() || null : null,
      storage_path: storagePath(inspection.kind, inspection.id, r.slot),
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
    };
  });
  const { error: insertError } = await supabase
    .from("inspection_photos")
    .upsert(rows, { onConflict: "inspection_id,slot" });
  if (insertError) throw new Error(insertError.message);

  const now = new Date().toISOString();
  const { data: submitted, error: updateError } = await supabase
    .from("inspections")
    .update({
      status: "submitted",
      submitted_at: now,
      // Registration photos are the baseline; nothing to analyse.
      ...(inspection.kind === "registration" ? { analysis_status: "done", analysis_finished_at: now } : {}),
    })
    .eq("id", inspection.id)
    .eq("status", "uploading")
    .select("id");
  if (updateError) throw new Error(updateError.message);
  if (!submitted?.length) throw new Error("Inspection was already submitted");

  if (inspection.kind === "registration") {
    await supabase.from("vehicles").update({ status: "available", updated_at: now }).eq("id", inspection.vehicle_id).eq("status", "registering");
  } else if (inspection.kind === "pickup") {
    await supabase.from("rentals").update({ status: "in_use", picked_up_at: now }).eq("id", inspection.rental_id!).eq("status", "picking_up");
  } else {
    await supabase.from("rentals").update({ status: "returned", returned_at: now }).eq("id", inspection.rental_id!).eq("status", "in_use");
    await supabase.from("vehicles").update({ status: "available", updated_at: now }).eq("id", inspection.vehicle_id).eq("status", "in_use");
  }
}
