"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth";
import { IMPORTANCE, STATUSES } from "@/lib/reviews";
import { getSupabase } from "@/lib/supabase";

function parseId(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("Invalid review id");
  return id;
}

async function updateReview(id: number, fields: Record<string, unknown>) {
  await requireSession();
  const { error } = await getSupabase().from("reviews").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function updateReviewTriage(formData: FormData) {
  const id = parseId(formData);
  const status = String(formData.get("status"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  if (!(status in STATUSES)) throw new Error("Invalid status");
  await updateReview(id, { status, note: note || null });
}

export async function setReviewImportance(formData: FormData) {
  const id = parseId(formData);
  const importance = String(formData.get("importance"));
  if (!(importance in IMPORTANCE)) throw new Error("Invalid importance");
  await updateReview(id, { importance });
}
