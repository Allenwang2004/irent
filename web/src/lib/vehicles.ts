import "server-only";
import { getSupabase } from "./supabase";

export const VEHICLE_STATUS_LABELS = {
  registering: "待登錄",
  available: "可借用",
  in_use: "使用中",
  maintenance: "整備中",
  retired: "已停用",
} as const;
export type VehicleStatus = keyof typeof VEHICLE_STATUS_LABELS;

export type Vehicle = {
  id: number;
  plate: string;
  car_model: string;
  status: VehicleStatus;
  registration_token: string;
  created_at: string;
};

export type Damage = {
  id: number;
  vehicle_id: number;
  location: string;
  damage_type: string;
  severity: string;
  image_type: number | null;
  note: string | null;
  source: "registration" | "alert";
  status: "active" | "repaired";
  created_at: string;
  reference_photo_id: number | null;
};

// The phone app the registration link points to.
export function mobileBaseUrl() {
  return (process.env.MOBILE_BASE_URL ?? "https://irent-mobile.vercel.app").replace(/\/$/, "");
}

export function registrationLink(v: Pick<Vehicle, "id" | "registration_token">) {
  return `${mobileBaseUrl()}/register/${v.id}?token=${v.registration_token}`;
}

export async function listVehicles() {
  const supabase = getSupabase();
  const [{ data: vehicles, error }, { data: damages, error: damageError }, { data: alerts, error: alertError }] =
    await Promise.all([
      supabase.from("vehicles").select("id, plate, car_model, status, registration_token, created_at").order("plate"),
      supabase.from("vehicle_damages").select("vehicle_id").eq("status", "active"),
      supabase.from("alerts").select("vehicle_id").eq("status", "open"),
    ]);
  if (error) throw new Error(error.message);
  if (damageError) throw new Error(damageError.message);
  if (alertError) throw new Error(alertError.message);
  const count = (rows: { vehicle_id: number }[] | null) =>
    (rows ?? []).reduce((m, r) => m.set(r.vehicle_id, (m.get(r.vehicle_id) ?? 0) + 1), new Map<number, number>());
  const damageCount = count(damages);
  const alertCount = count(alerts);
  return ((vehicles ?? []) as Vehicle[]).map((v) => ({
    ...v,
    activeDamages: damageCount.get(v.id) ?? 0,
    openAlerts: alertCount.get(v.id) ?? 0,
  }));
}

export async function getVehicle(id: number) {
  const { data, error } = await getSupabase()
    .from("vehicles")
    .select("id, plate, car_model, status, registration_token, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Vehicle | null;
}

export async function listDamages(vehicleId: number) {
  const { data, error } = await getSupabase()
    .from("vehicle_damages")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("status")
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []) as Damage[];
}

export async function openRentalFor(vehicleId: number) {
  const { data, error } = await getSupabase()
    .from("rentals")
    .select("id, order_no, status, started_at")
    .eq("vehicle_id", vehicleId)
    .in("status", ["picking_up", "in_use"])
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: number; order_no: string; status: string; started_at: string } | null;
}
