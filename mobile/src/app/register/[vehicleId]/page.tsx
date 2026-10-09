import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getVehicle } from "@/lib/vehicles";
import { InspectionFlow } from "../../inspection-flow";
import { Unavailable } from "../../unavailable";

type Params = Promise<{ vehicleId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Opened from the link the back office shows for a newly added car.
export default function RegisterPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-ink-3">載入中...</p>}>
      <RegisterContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function RegisterContent({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const id = Number((await params).vehicleId);
  const { token } = await searchParams;
  if (!Number.isInteger(id) || typeof token !== "string") notFound();
  const vehicle = await getVehicle(id);
  if (!vehicle || vehicle.registration_token !== token) notFound();
  if (vehicle.status !== "registering") return <Unavailable message={`${vehicle.plate} 已經登錄過了。`} />;
  return (
    <InspectionFlow
      kind="registration"
      vehicle={{ id: vehicle.id, plate: vehicle.plate, car_model: vehicle.car_model }}
      knownDamages={[]}
      token={token}
    />
  );
}
