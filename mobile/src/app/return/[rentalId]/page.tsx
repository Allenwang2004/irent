import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSupabase } from "@/lib/supabase";
import { ReturnFlow } from "./return-flow";

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

  const { data, error } = await getSupabase()
    .from("rentals")
    .select("id, order_no, plate, car_model")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();

  return <ReturnFlow rental={data} />;
}
