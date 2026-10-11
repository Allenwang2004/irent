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

// A return whose doors were locked but whose exterior photos never went in
// (page closed). The car is shut, so it cannot be redone from the app.
export async function hasLockedReturn(rentalId: number) {
  const { data, error } = await getSupabase()
    .from("inspections")
    .select("id")
    .eq("rental_id", rentalId)
    .eq("kind", "return")
    .eq("status", "uploading")
    .not("locked_at", "is", null)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

// The in-use page: the car, and when the renter took it.
export async function getRentalInUse(id: number) {
  const { data, error } = await getSupabase()
    .from("rentals")
    .select("id, order_no, status, picked_up_at, vehicles(id, plate, car_model)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const vehicle = (Array.isArray(data.vehicles) ? data.vehicles[0] : data.vehicles) as Vehicle | null;
  return {
    id: data.id as number,
    orderNo: data.order_no as string,
    status: data.status as string,
    pickedUpAt: data.picked_up_at as string | null,
    vehicle,
  };
}
