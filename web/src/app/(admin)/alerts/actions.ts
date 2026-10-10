"use server";

import { refresh } from "next/cache";
import { DAMAGE_ALERT_KINDS } from "@/lib/alerts";
import { requireSession } from "@/lib/auth";
import { ANGLE_LABELS, DAMAGE_TYPES, SEVERITIES } from "@/lib/inspections";
import { getSupabase } from "@/lib/supabase";

// Confirming a damage alert can also record the damage on the car, so the next
// renter is told about it and is not blamed for it.
export async function handleAlert(formData: FormData) {
  await requireSession();
  const alertId = Number(formData.get("id"));
  const decision = String(formData.get("decision"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!Number.isInteger(alertId) || (decision !== "confirmed" && decision !== "dismissed")) {
    throw new Error("Invalid alert update");
  }
  const supabase = getSupabase();

  const { data: alert, error: readError } = await supabase
    .from("alerts")
    .select("id, kind, vehicle_id, photo_id, status, inspection_photos(image_type)")
    .eq("id", alertId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!alert || alert.status !== "open") throw new Error("Alert is not open");

  if (decision === "confirmed" && DAMAGE_ALERT_KINDS.includes(alert.kind) && formData.get("record") === "1") {
    const location = String(formData.get("location") ?? "").trim().slice(0, 40);
    const damageType = String(formData.get("damage_type"));
    const severity = String(formData.get("severity"));
    const photo = alert.inspection_photos as unknown as { image_type: number | null } | null;
    const imageType = photo?.image_type ?? null;
    if (
      !location ||
      !(DAMAGE_TYPES as readonly string[]).includes(damageType) ||
      !(SEVERITIES as readonly string[]).includes(severity)
    ) {
      throw new Error("Invalid damage");
    }
    const { error } = await supabase.from("vehicle_damages").insert({
      vehicle_id: alert.vehicle_id,
      location,
      damage_type: damageType,
      severity,
      image_type: imageType !== null && imageType in ANGLE_LABELS ? imageType : null,
      note: note || null,
      source: "alert",
      reference_photo_id: alert.photo_id,
    });
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase
    .from("alerts")
    .update({ status: decision, note: note || null, handled_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("status", "open");
  if (error) throw new Error(error.message);
  // A false alarm needs no cleaning or repair; cancelling also lets the car be rented again.
  if (decision === "dismissed") await cancelWorkOrders([alertId]);
  refresh();
}

async function cancelWorkOrders(alertIds: number[]) {
  if (!alertIds.length) return;
  const { error } = await getSupabase()
    .from("work_orders")
    .update({ status: "cancelled", closed_at: new Date().toISOString(), note: "預警已駁回" })
    .in("alert_id", alertIds)
    .eq("status", "open");
  if (error) throw new Error(error.message);
}

// Dismiss every open alert of one pickup or return at once.
export async function dismissCase(formData: FormData) {
  await requireSession();
  const inspectionId = String(formData.get("inspection_id"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!/^[0-9a-f-]{36}$/.test(inspectionId)) throw new Error("Invalid case");
  const { data, error } = await getSupabase()
    .from("alerts")
    .update({ status: "dismissed", note: note || "整筆駁回", handled_at: new Date().toISOString() })
    .eq("inspection_id", inspectionId)
    .eq("status", "open")
    .select("id");
  if (error) throw new Error(error.message);
  await cancelWorkOrders((data ?? []).map((a) => a.id));
  refresh();
}

export async function reopenAlert(formData: FormData) {
  await requireSession();
  const alertId = Number(formData.get("id"));
  if (!Number.isInteger(alertId)) throw new Error("Invalid alert");
  const { error } = await getSupabase()
    .from("alerts")
    .update({ status: "open", handled_at: null })
    .eq("id", alertId);
  if (error) throw new Error(error.message);
  refresh();
}
