import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getKnownDamages, getVehicle } from "@/lib/vehicles";
import { InspectionFlow } from "../../inspection-flow";
import { Unavailable } from "../../unavailable";

type Params = Promise<{ vehicleId: string }>;

export default function PickupPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-ink-3">載入中...</p>}>
      <PickupContent params={params} />
    </Suspense>
  );
}

async function PickupContent({ params }: { params: Params }) {
  const id = Number((await params).vehicleId);
  if (!Number.isInteger(id)) notFound();
  const vehicle = await getVehicle(id);
  if (!vehicle) notFound();
  if (vehicle.status !== "available") return <Unavailable message={`${vehicle.plate} 目前無法借用。`} />;
  const damages = await getKnownDamages(id);
  return (
    <InspectionFlow
      kind="pickup"
      vehicle={{ id: vehicle.id, plate: vehicle.plate, car_model: vehicle.car_model }}
      knownDamages={damages}
    />
  );
}
