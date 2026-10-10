import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getKnownDamages, getOpenRental, getVehicle, hasLockedReturn } from "@/lib/vehicles";
import { InspectionFlow } from "../../inspection-flow";
import { Unavailable } from "../../unavailable";

type Params = Promise<{ rentalId: string }>;

export default function ReturnPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-ink-3">載入中...</p>}>
      <ReturnContent params={params} />
    </Suspense>
  );
}

async function ReturnContent({ params }: { params: Params }) {
  const id = Number((await params).rentalId);
  if (!Number.isInteger(id)) notFound();
  const rental = await getOpenRental(id);
  if (!rental) notFound();
  if (rental.status !== "in_use") return <Unavailable message="這筆租用已經還車或尚未完成取車。" />;
  if (await hasLockedReturn(rental.id)) {
    return <Unavailable message="車門已經鎖上，但外部照片沒有完成。請聯絡客服協助完成還車。" />;
  }
  const [vehicle, damages] = await Promise.all([getVehicle(rental.vehicle_id), getKnownDamages(rental.vehicle_id)]);
  if (!vehicle) notFound();
  return (
    <InspectionFlow
      kind="return"
      vehicle={{ id: vehicle.id, plate: vehicle.plate, car_model: vehicle.car_model }}
      knownDamages={damages}
      rentalId={rental.id}
    />
  );
}
