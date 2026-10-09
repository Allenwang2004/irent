import "server-only";
import type { KnownDamage, Vehicle } from "./inspection";
import { getSupabase } from "./supabase";

export async function getVehicle(id: number) {
  const { data, error } = await getSupabase()
    .from("vehicles")
    .select("id, plate, car_model, status, registration_token")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as (Vehicle & { status: string; registration_token: string }) | null;
}

export async function getKnownDamages(vehicleId: number): Promise<KnownDamage[]> {
  const { data, error } = await getSupabase()
    .from("vehicle_damages")
    .select("id, location, damage_type, severity, image_type, note")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active")
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []) as KnownDamage[];
}

export async function getOpenRental(id: number) {
  const { data, error } = await getSupabase()
    .from("rentals")
    .select("id, vehicle_id, status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: number; vehicle_id: number; status: string } | null;
}
