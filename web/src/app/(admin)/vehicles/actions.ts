"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { ANGLE_LABELS, DAMAGE_TYPES, SEVERITIES } from "@/lib/inspections";
import { getSupabase } from "@/lib/supabase";

const PLATE_RE = /^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}$/;

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function id(formData: FormData, key = "id") {
  const n = Number(formData.get(key));
  if (!Number.isInteger(n)) throw new Error(`Invalid ${key}`);
  return n;
}

export type CreateVehicleState = { error?: string };

export async function createVehicle(_prev: CreateVehicleState, formData: FormData): Promise<CreateVehicleState> {
  await requireSession();
  const plate = text(formData, "plate", 12).toUpperCase();
  const carModel = text(formData, "car_model", 60);
  if (!PLATE_RE.test(plate)) return { error: "車牌格式不正確，例如 ABC-1234" };
  if (!carModel) return { error: "請填寫車型" };

  const { data, error } = await getSupabase()
    .from("vehicles")
    .insert({ plate, car_model: carModel })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "這個車牌已經登錄過了" : error.message };
  redirect(`/vehicles/${data.id}`);
}

export async function addDamage(formData: FormData) {
  await requireSession();
  const vehicleId = id(formData, "vehicle_id");
  const location = text(formData, "location", 40);
  const damageType = text(formData, "damage_type", 10);
  const severity = text(formData, "severity", 10);
  const imageType = formData.get("image_type") ? Number(formData.get("image_type")) : null;
  const note = text(formData, "note", 200);
  if (
    !location ||
    !(DAMAGE_TYPES as readonly string[]).includes(damageType) ||
    !(SEVERITIES as readonly string[]).includes(severity) ||
    (imageType !== null && !(imageType in ANGLE_LABELS))
  ) {
    throw new Error("Invalid damage");
  }

  const supabase = getSupabase();
  // Link the registration photo of that angle as the reference picture.
  let referencePhotoId: number | null = null;
  if (imageType !== null) {
    const { data } = await supabase
      .from("inspection_photos")
      .select("id, inspections!inner(vehicle_id, kind, status)")
      .eq("image_type", imageType)
      .eq("inspections.vehicle_id", vehicleId)
      .eq("inspections.kind", "registration")
      .eq("inspections.status", "submitted")
      .limit(1);
    referencePhotoId = data?.[0]?.id ?? null;
  }

  const { error } = await supabase.from("vehicle_damages").insert({
    vehicle_id: vehicleId,
    location,
    damage_type: damageType,
    severity,
    image_type: imageType,
    note: note || null,
    source: "registration",
    reference_photo_id: referencePhotoId,
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function setDamageStatus(formData: FormData) {
  await requireSession();
  const status = String(formData.get("status"));
  if (status !== "active" && status !== "repaired") throw new Error("Invalid status");
  const { error } = await getSupabase()
    .from("vehicle_damages")
    .update({ status, repaired_at: status === "repaired" ? new Date().toISOString() : null })
    .eq("id", id(formData));
  if (error) throw new Error(error.message);
  refresh();
}

// For a car stuck in use (pickup or return abandoned): close its open rental.
export async function releaseVehicle(formData: FormData) {
  await requireSession();
  const vehicleId = id(formData);
  const supabase = getSupabase();
  await supabase.from("rentals").update({ status: "cancelled" }).eq("vehicle_id", vehicleId).eq("status", "picking_up");
  await supabase
    .from("rentals")
    .update({ status: "returned", returned_at: new Date().toISOString() })
    .eq("vehicle_id", vehicleId)
    .eq("status", "in_use");
  const { error } = await supabase
    .from("vehicles")
    .update({ status: "available", updated_at: new Date().toISOString() })
    .eq("id", vehicleId)
    .eq("status", "in_use");
  if (error) throw new Error(error.message);
  refresh();
}

export async function setRetired(formData: FormData) {
  await requireSession();
  const retire = formData.get("retire") === "1";
  const { error } = await getSupabase()
    .from("vehicles")
    .update({ status: retire ? "retired" : "available", updated_at: new Date().toISOString() })
    .eq("id", id(formData))
    .eq("status", retire ? "available" : "retired");
  if (error) throw new Error(error.message);
  refresh();
}
