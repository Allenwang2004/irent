"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// Closing the last blocking order puts the car back on the pickup list
// (a database trigger re-evaluates the car's status).
export async function closeWorkOrder(formData: FormData) {
  await requireSession();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!Number.isInteger(id) || (status !== "done" && status !== "cancelled")) throw new Error("Invalid work order");
  const { error } = await getSupabase()
    .from("work_orders")
    .update({ status, note: note || null, closed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "open");
  if (error) throw new Error(error.message);
  refresh();
}
